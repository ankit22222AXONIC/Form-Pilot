import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ScanSearch, Settings, Database, AlertCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { startAnalysisSession, type DetectionResult } from '../content/detector';
import { aiService } from '../shared/services/ai';
import { matchingService } from '../shared/services/matching';
import { authService } from '../shared/services/auth';
import { vaultService } from '../shared/services/storage';
import { executeAutofill } from '../content/autofill';
import { trustService } from '../shared/services/trust';
import type { AIAnalysisResponse, MatchResult, AutofillResult, WebsiteTrustAnalysis } from '../shared/types';

export default function Popup() {
  const [analysisResult, setAnalysisResult] = useState<DetectionResult | null>(null);
  const [trustAnalysis, setTrustAnalysis] = useState<WebsiteTrustAnalysis | null>(null);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIAnalysisResponse | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const [autofillResults, setAutofillResults] = useState<AutofillResult[] | null>(null);
  const [isFilling, setIsFilling] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    const handleMessage = (message: any, sender?: chrome.runtime.MessageSender) => {
      // Validate sender: only accept messages from the currently active tab
      if (activeTabId !== null && sender?.tab?.id !== undefined && sender.tab.id !== activeTabId) {
        return;
      }
      if (message.type === 'FORM_UPDATE' && message.payload) {
        setAnalysisResult(message.payload);
      }
    };
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }
    
    // Cleanup on unmount (when popup closes)
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
      if (activeTabId && typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.sendMessage(activeTabId, { type: 'STOP_OBSERVING' }).catch(() => {});
      }
    };
  }, [activeTabId]);

  const openDashboard = () => {
    const url = 'src/dashboard/index.html';
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL(url) });
    } else {
      window.open(`/${url}`, '_blank');
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setIsAnalyzing(true);
    setAiResponse(null);
    
    let res: DetectionResult | null = null;

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) throw new Error('No active tab found.');

        // Restrict running on certain urls
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
          throw new Error('Cannot analyze browser internal pages.');
        }

        setActiveTabId(tab.id);

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: startAnalysisSession,
        });

        if (results && results[0] && results[0].result) {
          res = results[0].result as DetectionResult;
          setAnalysisResult(res);
        } else {
          throw new Error('Analysis returned no data.');
        }

        // Run website trust and fraud risk analysis
        const trust = await trustService.analyzeWebsite({
          url: tab.url || res.pageUrl || window.location.href,
          pageTitle: tab.title || res.pageTitle || '',
          forms: res.forms
        });
        setTrustAnalysis(trust);
      } else {
        // Fallback for local web dev testing
        res = startAnalysisSession();
        setAnalysisResult(res);
        const trust = await trustService.analyzeWebsite({
          url: window.location.href,
          pageTitle: document.title,
          forms: res.forms
        });
        setTrustAnalysis(trust);
      }
    } catch (err: any) {
      setError(err.message || 'Permission denied or analysis failed.');
      setIsAnalyzing(false);
      return;
    }

    if (res && res.totalFields > 0) {
      setAiLoading(true);
      const controller = new AbortController();
      setAbortController(controller);
      try {
        const aiData = await aiService.analyzeForm(res, controller);
        setAiResponse(aiData);

        const key = await authService.getSessionKey();
        if (!key) {
          setVaultLocked(true);
        } else {
          setVaultLocked(false);
          const vData = await vaultService.getVaultData();
          if (vData) {
            const matches = await matchingService.matchFields(aiData, vData);
            
            // Extract existing values to prevent silent overwrites
            const existingValues = new Map<string, string>();
            res.forms.forEach(f => f.fields.forEach(field => {
              if (field.value) existingValues.set(field.id, field.value);
            }));

            const preSelected = new Set<string>();
            matches.forEach(m => {
              const currentVal = existingValues.get(m.fieldId);
              if (currentVal && currentVal !== 'false' && currentVal !== m.suggestedValue) {
                m.requiresReview = true;
                m.reason = 'Field already contains a value. Review before overwriting.';
              } else if (m.status === 'MATCHED' && !m.requiresReview) {
                preSelected.add(m.fieldId);
              }
            });
            
            setMatchResults(matches);
            setSelectedFieldIds(preSelected);
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message || 'AI Analysis failed.');
        }
      } finally {
        setAiLoading(false);
        setAbortController(null);
      }
    }
    setIsAnalyzing(false);
  };

  const handleStopAnalysis = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    if (activeTabId && typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.sendMessage(activeTabId, { type: 'STOP_OBSERVING' }).catch(() => {});
    }
    setAnalysisResult(null);
    setTrustAnalysis(null);
    setRiskAcknowledged(false);
    setAiResponse(null);
    setMatchResults(null);
    setAutofillResults(null);
    setSelectedFieldIds(new Set());
    setAiLoading(false);
  };

  const handleFillSelected = async () => {
    if (!matchResults || selectedFieldIds.size === 0 || !activeTabId) return;
    
    setIsFilling(true);
    setError(null);
    setAutofillResults(null);

    const ops = matchResults
      .filter(m => selectedFieldIds.has(m.fieldId) && m.suggestedValue)
      .map(m => ({
        fieldId: m.fieldId,
        value: m.suggestedValue!
      }));

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          func: executeAutofill,
          args: [ops]
        });
        
        if (results && results[0] && results[0].result) {
          setAutofillResults(results[0].result as AutofillResult[]);
        }
      } else {
        // Local mock for dev
        const mockResults = ops.map(op => ({ fieldId: op.fieldId, success: true }));
        setAutofillResults(mockResults);
      }
    } catch (err: any) {
      setError(err.message || 'Autofill failed.');
    } finally {
      setIsFilling(false);
    }
  };

  if (analysisResult) {
    return (
      <div className="flex flex-col h-[500px] w-[350px] bg-gray-50">
        <header className="px-4 py-3 flex items-center gap-3 bg-white border-b border-gray-100">
          <button onClick={handleStopAnalysis} className="p-1.5 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="font-semibold text-gray-900">Analysis Results</h2>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {trustAnalysis && (
            <div className={`p-3 rounded-lg border text-xs ${
              trustAnalysis.status === 'HIGH_RISK'
                ? 'bg-red-50/70 border-red-200 text-red-950'
                : trustAnalysis.status === 'CAUTION'
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : trustAnalysis.status === 'NO_OBVIOUS_WARNINGS'
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  {trustAnalysis.status === 'HIGH_RISK' ? (
                    <ShieldAlert size={16} className="text-red-600 shrink-0" />
                  ) : trustAnalysis.status === 'CAUTION' ? (
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  ) : trustAnalysis.status === 'NO_OBVIOUS_WARNINGS' ? (
                    <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                  ) : (
                    <HelpCircle size={16} className="text-gray-500 shrink-0" />
                  )}
                  <span>Website Trust Check</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                  trustAnalysis.status === 'HIGH_RISK'
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : trustAnalysis.status === 'CAUTION'
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : trustAnalysis.status === 'NO_OBVIOUS_WARNINGS'
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  {trustAnalysis.status === 'HIGH_RISK' ? 'High Risk' :
                   trustAnalysis.status === 'CAUTION' ? 'Caution' :
                   trustAnalysis.status === 'NO_OBVIOUS_WARNINGS' ? 'Low Risk Indicators' : 'Unverified'}
                </span>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500">Domain:</span>
                  <span className="font-mono font-medium truncate max-w-[200px]" title={trustAnalysis.domain}>{trustAnalysis.domain}</span>
                </div>
                <div className="text-[11px] mt-0.5">
                  <span className="text-gray-500">Status: </span>
                  <span className="font-semibold">{trustAnalysis.statusLabel}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 italic">
                  {trustAnalysis.disclaimer}
                </p>
              </div>

              {trustAnalysis.findings.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="font-bold text-[11px] mb-1 text-gray-800">Findings ({trustAnalysis.findings.length}):</p>
                  <ul className="space-y-1 pl-1">
                    {trustAnalysis.findings.map((f) => (
                      <li key={f.id} className="text-[11px] leading-relaxed">
                        <span className={`font-semibold ${
                          f.severity === 'high' ? 'text-red-700' :
                          f.severity === 'medium' ? 'text-amber-700' : 'text-gray-700'
                        }`}>• {f.title}: </span>
                        <span className="text-gray-600">{f.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-[11px] leading-relaxed">
                  <strong className="font-semibold text-gray-800">Recommendation: </strong>
                  <span className="text-gray-600">{trustAnalysis.recommendation}</span>
                </p>
              </div>
            </div>
          )}

          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium">AI is analyzing form fields...</p>
              <p className="text-xs mt-1 text-center px-4">Depending on the model, this may take a few seconds.</p>
            </div>
          ) : aiResponse ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                <h3 className="font-bold text-indigo-900 text-sm mb-1">{aiResponse.formTitle || 'Unknown Form'}</h3>
                <p className="text-xs text-indigo-700">{aiResponse.summary}</p>
              </div>

              {vaultLocked && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                  <ShieldCheck size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-red-900 mb-0.5">Vault is Locked</h4>
                    <p className="text-xs text-red-700 mb-2">Unlock your vault in the dashboard to match and fill your personal data.</p>
                    <button onClick={openDashboard} className="text-xs font-medium text-red-800 bg-red-100/80 hover:bg-red-200 px-3 py-1.5 rounded transition-colors">
                      Open Dashboard
                    </button>
                  </div>
                </div>
              )}

              {aiResponse.warnings && aiResponse.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg">
                  <h4 className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <AlertCircle size={14} /> Warnings
                  </h4>
                  <ul className="list-disc pl-4 text-xs text-amber-800 space-y-0.5">
                    {aiResponse.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    {matchResults ? 'Matched Data' : 'Interpreted Fields'}
                  </h4>
                  {matchResults && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const allEligible = matchResults.filter(m => m.suggestedValue).map(m => m.fieldId);
                          setSelectedFieldIds(new Set(allEligible));
                        }}
                        className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100"
                      >
                        Select All
                      </button>
                      <button 
                        onClick={() => setSelectedFieldIds(new Set())}
                        className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-100"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {matchResults ? matchResults.map((match) => {
                    const isSelected = selectedFieldIds.has(match.fieldId);
                    const fillResult = autofillResults?.find(r => r.fieldId === match.fieldId);
                    
                    return (
                      <div key={match.fieldId} className={`p-3 rounded-lg border ${
                        fillResult ? (fillResult.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') :
                        isSelected ? 'border-indigo-300 bg-indigo-50/30' :
                        match.status === 'MATCHED' ? 'border-green-200 bg-green-50/30' :
                        match.status === 'MISSING' ? 'border-gray-200 bg-gray-50' :
                        'border-amber-200 bg-amber-50/30'
                      }`}>
                        <div className="flex justify-between items-start mb-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            {match.suggestedValue && !fillResult && (
                              <input 
                                type="checkbox" 
                                className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newSet = new Set(selectedFieldIds);
                                  if (e.target.checked) newSet.add(match.fieldId);
                                  else newSet.delete(match.fieldId);
                                  setSelectedFieldIds(newSet);
                                }}
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900">{match.fieldLabel}</span>
                          </label>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            fillResult ? (fillResult.success ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200') :
                            match.status === 'MATCHED' ? 'bg-green-100 text-green-700 border-green-200' :
                            match.status === 'MISSING' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                            'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                            {fillResult ? (fillResult.success ? 'FILLED' : 'FAILED') : match.status}
                          </span>
                        </div>
                        
                        {match.suggestedValue ? (
                          <div className={`mt-2 border p-2 rounded text-sm font-medium ${
                            isSelected && !fillResult ? 'bg-white border-indigo-200 text-indigo-900' : 'bg-white border-gray-200 text-gray-800'
                          }`}>
                            {match.suggestedValue}
                          </div>
                        ) : (
                          <div className="mt-2 bg-white border border-dashed border-gray-300 p-2 rounded text-xs text-gray-500 italic">
                            No matching data available
                          </div>
                        )}
                        
                        <p className="text-[10px] text-gray-500 mt-2 flex gap-2 items-center">
                          {match.requiresReview && !fillResult && <span className="text-amber-600 font-bold flex items-center gap-0.5"><AlertCircle size={10}/> Review needed</span>}
                          {fillResult ? fillResult.reason || 'Successfully inserted' : match.reason}
                        </p>
                      </div>
                    );
                  }) : aiResponse.fields.map((field) => (
                    <div key={field.fieldId} className={`p-3 rounded-lg border ${field.ambiguous ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-gray-900" title={field.originalLabel}>{field.interpretedMeaning}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                          {field.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Original: "{field.originalLabel}"</p>
                      <div className="flex gap-2 mb-2">
                        {field.required && <span className="text-[10px] text-red-600 font-medium">Required</span>}
                        {field.ambiguous && <span className="text-[10px] text-amber-600 font-medium">Ambiguous</span>}
                        <span className="text-[10px] text-gray-400 font-medium">Format: {field.expectedFormat}</span>
                      </div>
                      {field.ambiguous && (
                        <p className="text-[10px] text-amber-700 bg-amber-100/50 p-1.5 rounded">{field.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {trustAnalysis?.status === 'HIGH_RISK' && matchResults && !autofillResults && (
                <div className="bg-red-50 border border-red-300 p-3 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-red-900">
                    <ShieldAlert size={16} className="text-red-600 shrink-0" />
                    <span>Fraud Risk Confirmation Required</span>
                  </div>
                  <p className="text-red-700 leading-snug">
                    Strong fraud or impersonation indicators were detected on this domain. Autofill is locked for safety.
                  </p>
                  <label className="flex items-start gap-2 pt-1 font-medium text-red-900 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                      checked={riskAcknowledged}
                      onChange={(e) => setRiskAcknowledged(e.target.checked)}
                    />
                    <span>I understand the fraud risk and explicitly want to proceed with autofill.</span>
                  </label>
                </div>
              )}

              {matchResults && !autofillResults && (
                <div className="sticky bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 flex flex-col gap-2 mt-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] -mx-4 -mb-4">
                  <PrimaryButton 
                    onClick={handleFillSelected} 
                    disabled={selectedFieldIds.size === 0 || isFilling || (trustAnalysis?.status === 'HIGH_RISK' && !riskAcknowledged)}
                    className="w-full justify-center py-2"
                  >
                    {isFilling
                      ? 'Filling...'
                      : trustAnalysis?.status === 'HIGH_RISK' && !riskAcknowledged
                      ? 'Autofill Blocked by Fraud Warning'
                      : `Fill ${selectedFieldIds.size} Selected Field${selectedFieldIds.size === 1 ? '' : 's'}`}
                  </PrimaryButton>
                  {error && <p className="text-xs text-center text-red-500">{error}</p>}
                </div>
              )}
              
              {autofillResults && (
                <div className="sticky bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 flex flex-col gap-2 mt-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] -mx-4 -mb-4">
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 mb-1">
                    <span className="text-xs font-medium text-gray-700">Fill Operation Complete</span>
                    <span className="text-[10px] font-bold text-gray-500">{autofillResults.filter(r => r.success).length} / {autofillResults.length} Successful</span>
                  </div>
                  <button 
                    onClick={handleStopAnalysis} 
                    className="w-full justify-center py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close & Review Form Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-4">
                <div className="flex-1 bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
                  <p className="text-2xl font-bold text-indigo-600">{analysisResult.forms.length}</p>
                  <p className="text-xs text-gray-500 font-medium">Forms</p>
                </div>
                <div className="flex-1 bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
                  <p className="text-2xl font-bold text-indigo-600">{analysisResult.totalFields}</p>
                  <p className="text-xs text-gray-500 font-medium">Fields</p>
                </div>
              </div>

              {analysisResult.forms.map((form) => (
                <div key={form.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <h3 className="font-medium text-sm text-gray-800">{form.name}</h3>
                    <p className="text-xs text-gray-500">{form.fields.length} fields</p>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {form.fields.map((field) => (
                      <li key={field.id} className="px-3 py-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate pr-2" title={field.label}>{field.label}</span>
                          <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {field.type}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {field.required && <span className="text-[10px] text-red-600 font-medium">Required</span>}
                          {field.disabled && <span className="text-[10px] text-gray-400 font-medium">Disabled</span>}
                          {field.readonly && <span className="text-[10px] text-gray-400 font-medium">Readonly</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {analysisResult.totalFields === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No standard form fields detected on this page.
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px] w-[350px] bg-white">
      {/* Header */}
      <header className="px-5 py-6 flex flex-col items-center justify-center border-b border-gray-100 bg-gray-50/50">
        <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm mb-3">
          <ShieldCheck className="text-white" size={24} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">FormPilot</h1>
        <p className="text-gray-500 font-medium text-xs mt-1">Forms, simplified.</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-5 py-5 gap-5 overflow-y-auto">
        <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
          <AlertCircle className="text-indigo-600 mt-0.5 shrink-0" size={16} />
          <div className="text-sm text-indigo-900">
            <span className="font-medium block mb-0.5">Ready to scan</span>
            FormPilot requires your permission to analyze this page.
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <PrimaryButton 
            icon={<ScanSearch size={18} />} 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="w-full justify-center"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Current Form'}
          </PrimaryButton>
          {error && <p className="text-xs text-center text-red-500 mt-2">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button 
            onClick={openDashboard}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Database size={18} className="text-gray-500" />
            <span className="text-xs font-medium">My Data</span>
          </button>
          
          <button 
            onClick={openDashboard}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings size={18} className="text-gray-500" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 p-3 bg-gray-50">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
          <ShieldCheck size={14} className="text-green-600" />
          Local-first by design
        </div>
      </footer>
    </div>
  );
}
