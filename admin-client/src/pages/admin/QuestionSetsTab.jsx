import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiClock, FiTarget, FiZap, FiCalendar, FiUploadCloud, FiX, FiSearch, FiEye, FiCode, FiFileText, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import DOMPurify from 'dompurify';
import BaseCard from '../../components/BaseCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import SkeletonCard from '../../components/SkeletonCard';
import EmptyState from '../../components/EmptyState';
import CodeEditor from '../../components/CodeEditor';
import { LANGUAGE_MAP, LANGUAGE_OPTIONS } from '../../constants/languages';
import { api } from '../../lib/api';
import { isDrivableSignature } from '../../lib/leetcodeDriver';

const SignatureInfo = ({ functionName, params, returnType }) => {
  const hasParams = Array.isArray(params) && params.length > 0;
  if (!functionName && !hasParams && !returnType) return null;
  const paramsStr = hasParams ? params.map(p=>`${p.name}: ${p.type}`).join(', ') : '(none)';
  const javaOk = isDrivableSignature('java', params, returnType);
  const cppOk = isDrivableSignature('cpp', params, returnType);
  return (
    <div className="text-[11px] font-mono bg-black/5 dark:bg-white/5 rounded px-2 py-1.5 mt-1 text-secondary">
      <div>{functionName||'?'}({paramsStr}) → {returnType||'?'}</div>
      <div className="mt-0.5">
        Java driver: <span className={javaOk?'text-green-500':'text-red-500'}>{javaOk?'supported':'not supported'}</span>
        {'  ·  '}
        C++ driver: <span className={cppOk?'text-green-500':'text-red-500'}>{cppOk?'supported':'not supported'}</span>
      </div>
    </div>
  );
};

const DIFFICULTY_POINTS = { Easy: 100, Medium: 200, Hard: 350 };

const initialQuestionState = {
  title:'',difficulty:'Easy',points:100,category:'',description:'',orderIndependent:false,
  hints:[''],leetcodeSlug:'',tags:[],codeSnippets:[],solutions:[],functionName:'',params:[],returnType:'',testCases:[]
};
const defaultChallengeForm = {
  title:'',description:'',link:'',difficulty:'Easy',points:100,orderIndependent:false,
  category:'Logic',tags:[],codeSnippets:[],solutions:[],functionName:'',params:[],returnType:'',testCases:[]
};
const prepareTestCases = (raw) => raw.filter(tc=>tc.label.trim()).map(tc=>{
  let args=[]; try{args=JSON.parse(tc.args)}catch{/* ignore parse error */} return{label:tc.label,args,expected:tc.expected};
});
const prepareSolutions = (solutions = []) => solutions
  .filter((s) => s.code?.trim())
  .map((s) => ({
    lang: s.lang || LANGUAGE_OPTIONS.find((opt) => opt.key === s.langSlug)?.label || s.langSlug,
    langSlug: s.langSlug,
    code: s.code,
  }));
const upsertSolution = (solutions = [], langSlug, code) => {
  const lang = LANGUAGE_OPTIONS.find((opt) => opt.key === langSlug)?.label || langSlug;
  const next = solutions.filter((s) => s.langSlug !== langSlug);
  if (code.trim()) next.push({ lang, langSlug, code });
  return next;
};
const emptyTestCase = ()=>({label:'',args:'[]',expected:''});

/** Decode HTML entities and strip outer quotes from expected values. */
const cleanExpected = (val) => {
  if (!val) return val;
  let s = val
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) s = s.slice(1, -1);
  return s;
};

const QuestionPreviewModal = ({ question, onClose }) => {
  const [activeTab, setActiveTab] = useState('description');
  const [selectedLang, setSelectedLang] = useState(
    question.codeSnippets?.[0]?.langSlug || 'javascript'
  );
  const [rightPanel, setRightPanel] = useState('starter');
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.documentElement.classList.contains('dark')
      );
    });
    obs.observe(document.documentElement, { attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);

  const sanitizedDescription = useMemo(
    () => ({ __html: DOMPurify.sanitize(question.description || '') }),
    [question.description]
  );

  const diffColor =
    question.difficulty === 'Easy'
      ? 'text-green-400 bg-green-400/10 border-green-400/30'
      : question.difficulty === 'Medium'
      ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      : 'text-red-400 bg-red-400/10 border-red-400/30';

  const starterCode = question.codeSnippets?.find(s => s.langSlug === selectedLang)?.code || '';
  const solutionCode = question.solutions?.find(s => s.langSlug === selectedLang)?.code || '';
  const codeToShow = rightPanel === 'solution' ? solutionCode : starterCode;
  const monacoLang = LANGUAGE_MAP[selectedLang]?.monacoLang ?? selectedLang;

  const hasSnippets = (question.codeSnippets?.length || 0) > 0;
  const hasSolutions = (question.solutions || []).some(s => s.code?.trim());
  const nonEmptyHints = (question.hints || []).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-6xl h-[88vh] bg-[var(--bg-app)] border border-glass-border rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-glass-border bg-black/[0.02] dark:bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-black text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded tracking-widest flex-shrink-0">PREVIEW</span>
            <h2 className="font-bold text-primary text-sm truncate">{question.title || 'Untitled Question'}</h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${diffColor}`}>{question.difficulty}</span>
            <span className="text-[11px] text-accent font-bold flex items-center gap-1 flex-shrink-0"><FiZap size={10}/> {question.points} XP</span>
          </div>
          <button onClick={onClose} className="text-tertiary hover:text-primary p-1 transition-colors ml-3 flex-shrink-0"><FiX size={18}/></button>
        </div>

        {/* Body: split layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: description panel */}
          <div className="w-[45%] flex flex-col border-r border-glass-border min-w-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 border-b border-glass-border flex-shrink-0 bg-black/[0.01] dark:bg-white/[0.01]">
              <button
                onClick={() => setActiveTab('description')}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-px ${
                  activeTab === 'description' ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <FiFileText size={11}/> Description
              </button>
              {nonEmptyHints.length > 0 && (
                <button
                  onClick={() => setActiveTab('hints')}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-px ${
                    activeTab === 'hints' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-secondary hover:text-primary'
                  }`}
                >
                  Hints ({nonEmptyHints.length})
                </button>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'description' ? (
                <div>
                  {/* Tags */}
                  {(question.tags?.length > 0 || question.category) && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(question.tags?.length > 0 ? question.tags : [question.category]).map(tag => (
                        <span key={tag} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{tag}</span>
                      ))}
                    </div>
                  )}
                  {question.description ? (
                    <div
                      className="prose dark:prose-invert prose-sm max-w-none text-secondary leading-relaxed
                        [&_pre]:bg-black/[0.05] dark:[&_pre]:bg-white/[0.05] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:my-3
                        [&_code]:text-accent [&_code]:bg-black/[0.05] dark:[&_code]:bg-white/[0.05] [&_code]:px-1 [&_code]:rounded [&_code]:text-[11px]
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                        [&_li]:mb-1 [&_p]:mb-3 [&_strong]:text-primary [&_table]:text-xs [&_table]:w-full
                        [&_th]:text-left [&_th]:py-1 [&_th]:px-2 [&_th]:bg-black/[0.05] dark:[&_th]:bg-white/[0.05]
                        [&_td]:py-1 [&_td]:px-2 [&_td]:border-t [&_td]:border-black/[0.05] dark:[&_td]:border-white/[0.05] [&_img]:rounded-lg"
                      dangerouslySetInnerHTML={sanitizedDescription}
                    />
                  ) : (
                    <p className="text-sm text-tertiary italic">No description yet.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {nonEmptyHints.map((hint, i) => (
                    <div key={i} className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
                      <p className="text-[10px] font-black text-yellow-400 mb-1 tracking-wider">HINT {i + 1}</p>
                      <p className="text-sm text-secondary leading-relaxed">{hint}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: code editor panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-glass-border bg-black/[0.02] dark:bg-white/[0.02] flex-shrink-0">
              <div className="flex items-center gap-2">
                <FiCode size={13} className="text-tertiary"/>
                <select
                  className="text-xs bg-transparent text-secondary border border-glass-border rounded-lg px-2 py-1 hover:border-accent/50 focus:outline-none focus:border-accent/50 transition-colors cursor-pointer"
                  value={selectedLang}
                  onChange={e => setSelectedLang(e.target.value)}
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}{opt.version ? ` (${opt.version})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                {hasSnippets && (
                  <button
                    onClick={() => setRightPanel('starter')}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      rightPanel === 'starter' ? 'bg-black/10 dark:bg-white/10 text-primary' : 'text-secondary hover:text-primary'
                    }`}
                  >Starter</button>
                )}
                {hasSolutions && (
                  <button
                    onClick={() => setRightPanel('solution')}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      rightPanel === 'solution' ? 'bg-accent/20 text-accent' : 'text-secondary hover:text-primary'
                    }`}
                  >Solution</button>
                )}
                <span className="text-[10px] text-tertiary ml-2 bg-black/[0.05] dark:bg-white/[0.05] px-2 py-0.5 rounded font-mono">read-only</span>
              </div>
            </div>

            {/* Monaco */}
            <div className="flex-1 overflow-hidden">
              {codeToShow ? (
                <CodeEditor
                  value={codeToShow}
                  onChange={() => {}}
                  language={monacoLang}
                  isDark={isDark}
                  readOnly={true}
                  height="100%"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div>
                    <FiCode size={32} className="text-primary/10 mb-3 mx-auto"/>
                    <p className="text-sm text-secondary font-medium">No starter code</p>
                    <p className="text-xs text-tertiary mt-1">for {LANGUAGE_OPTIONS.find(o => o.key === selectedLang)?.label || selectedLang}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const QuestionSetsTab = () => {
  const qc = useQueryClient();
  const [view,setView] = useState('list');
  const [importModalOpen,setImportModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [form,setForm] = useState({title:'',weekNumber:1,deadline:'',targetLevel:'Both',questions:[{...initialQuestionState}]});
  const [challengeFilters,setChallengeFilters] = useState({search:'',range:'all',from:'',to:''});
  const [createChallengeForm,setCreateChallengeForm] = useState(defaultChallengeForm);
  const [editingChallenge,setEditingChallenge] = useState(null);
  const [deleteTarget,setDeleteTarget] = useState(null);
  const [leetcodeInput,setLeetcodeInput] = useState('');
  const [isFetchingLC,setIsFetchingLC] = useState(false);
  const [snippetLang,setSnippetLang] = useState('');
  const [editingSetId,setEditingSetId] = useState(null);
  const [deleteSetTarget,setDeleteSetTarget] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [publishWarning, setPublishWarning] = useState(null);
  const [solutionLangByKey, setSolutionLangByKey] = useState({});
  const [previewQuestion, setPreviewQuestion] = useState(null);

  const blankForm = ()=>({title:'',weekNumber:1,deadline:'',targetLevel:'Both',questions:[{...initialQuestionState}]});

  const setsQuery = useQuery({queryKey:['admin-question-sets'],queryFn:async()=>{try{const r=await api.get('/api/sets');return r.data.data||[]}catch{return[]}}});

  const createSetMutation = useMutation({
    mutationFn:async(d)=>(await api.post('/api/sets',d)).data,
    onSuccess:()=>{toast.success('Question Set published!');qc.invalidateQueries({ queryKey: ['admin-question-sets'] });qc.invalidateQueries({ queryKey: ['admin-manage-challenges'] });setView('list');setForm(blankForm())},
    onError:(e)=>toast.error(e.response?.data?.message||'Failed')
  });

  const updateSetMutation = useMutation({
    mutationFn:async({id,body})=>(await api.put(`/api/sets/${id}`,body)).data,
    onSuccess:()=>{toast.success('Question Set updated!');qc.invalidateQueries({ queryKey: ['admin-question-sets'] });qc.invalidateQueries({ queryKey: ['admin-manage-challenges'] });setView('list');setEditingSetId(null);setForm(blankForm())},
    onError:(e)=>toast.error(e.response?.data?.message||'Failed')
  });

  const deleteSetMutation = useMutation({
    mutationFn:async(id)=>api.delete(`/api/sets/${id}`),
    onSuccess:()=>{toast.success('Question Set deleted');qc.invalidateQueries({ queryKey: ['admin-question-sets'] });qc.invalidateQueries({ queryKey: ['admin-manage-challenges'] });setDeleteSetTarget(null)},
    onError:(e)=>toast.error(e.response?.data?.message||'Failed')
  });

  const importMutation = useMutation({
    mutationFn:async(f)=>{const fd=new FormData();fd.append('file',f);return(await api.post('/api/challenges/import',fd,{headers:{'Content-Type':'multipart/form-data'}})).data},
    onSuccess:(d)=>{toast.success(d.message||'Imported!');qc.invalidateQueries({ queryKey: ['admin-question-sets'] });setImportModalOpen(false)},
    onError:(e)=>toast.error(e.response?.data?.message||'Failed')
  });

  const fetchLeetCodeMutation = useMutation({
    mutationFn:async({slug,index})=>{const r=await api.get(`/api/challenges/fetch-leetcode-details?slug=${slug}`);return{data:r.data.data,index}},
    onSuccess:({data,index})=>{
      toast.success('LeetCode problem fetched!');const nq=[...form.questions];
      nq[index].title=data.title||'';nq[index].description=data.content||'';nq[index].difficulty=data.difficulty||'Easy';nq[index].points=DIFFICULTY_POINTS[nq[index].difficulty]??100;
      const tags=(data.topicTags||[]).map(t=>t.name);nq[index].category=tags[0]||'General';nq[index].tags=tags;
      nq[index].codeSnippets=data.codeSnippets||[];nq[index].functionName=data.functionName||'';
      nq[index].params=data.params||[];nq[index].returnType=data.returnType||'';
      nq[index].orderIndependent=!!data.orderIndependent;
      nq[index].testCases=(data.testCases||[]).map(tc=>({...tc,args:JSON.stringify(tc.args),expected:cleanExpected(tc.expected)}));
      setForm({...form,questions:nq});
    },
    onError:(e)=>toast.error(e.response?.data?.message||'Failed to fetch')
  });

  const manageChallengesQuery = useQuery({
    queryKey:['admin-manage-challenges',challengeFilters],enabled:view==='challenges',
    queryFn:async()=>{try{const p=new URLSearchParams();p.set('page','1');p.set('limit','100');p.set('sortBy','createdAt');p.set('sortDir','desc');
      if(challengeFilters.search)p.set('search',challengeFilters.search);
      const r=await api.get(`/api/challenges?${p.toString()}`);return r.data.data||[]}catch{return[]}}
  });

  const createChallengeMutation = useMutation({
    mutationFn:async(d)=>api.post('/api/challenges',d),
    onSuccess:()=>{toast.success('Challenge created!');setCreateChallengeForm(defaultChallengeForm);setLeetcodeInput('');setView('challenges');qc.invalidateQueries({ queryKey: ['admin-manage-challenges'] })},
    onError:(e)=>toast.error(e.response?.data?.message||'Failed')
  });

  const updateChallengeMutation = useMutation({
    mutationFn:async(d)=>api.put(`/api/challenges/${d.id}`,d.body),
    onSuccess:()=>{toast.success('Updated!');setEditingChallenge(null);qc.invalidateQueries({ queryKey: ['admin-manage-challenges'] })},
    onError:(e)=>toast.error(e.response?.data?.message||'Failed')
  });

  const deleteChallengeMutation = useMutation({
    mutationFn:async(id)=>api.delete(`/api/challenges/${id}`),
    onSuccess:()=>{toast.success('Deleted!');setDeleteTarget(null);qc.invalidateQueries({ queryKey: ['admin-manage-challenges'] })},
    onError:(e)=>toast.error(e.response?.data?.message||'Failed')
  });

  const handleChallengeAutoFill = async()=>{
    if(!leetcodeInput)return toast.error('Enter a slug or URL');
    const slug=leetcodeInput.replace('https://leetcode.com/problems/','').split('/')[0].trim();
    setIsFetchingLC(true);
    try{
      const r=await api.get(`/api/challenges/fetch-leetcode-details?slug=${slug}`);
      const{title,content,difficulty,topicTags,codeSnippets,functionName,params,returnType,orderIndependent,testCases}=r.data.data;
      const tags=(topicTags||[]).map(t=>t.name);
      setCreateChallengeForm(p=>({...p,title,description:content,difficulty,points:DIFFICULTY_POINTS[difficulty]??100,category:tags[0]||p.category,
        link:`https://leetcode.com/problems/${slug}/`,tags,codeSnippets:codeSnippets||[],
        functionName:functionName||'',params:params||[],returnType:returnType||'',orderIndependent:!!orderIndependent,
        testCases:(testCases||[]).map(tc=>({...tc,args:JSON.stringify(tc.args),expected:cleanExpected(tc.expected)}))}));
      if(codeSnippets?.length)setSnippetLang(codeSnippets[0].langSlug);
      toast.success('Fetched!');
    }catch(e){toast.error(e.response?.data?.message||'Failed')}finally{setIsFetchingLC(false)}
  };

  const handleFileChange=(e)=>{const f=e.target.files?.[0];if(f)importMutation.mutate(f)};
  const handleAddQuestion=()=>{if(form.questions.length>=5)return toast.error('Max 5');setForm(p=>({...p,questions:[...p.questions,{...initialQuestionState}]}))};
  const handleRemoveQuestion=(i)=>{if(form.questions.length===1)return;setForm(p=>({...p,questions:p.questions.filter((_,j)=>j!==i)}))};
  const updateQuestion=(i,f,v)=>{const nq=[...form.questions];nq[i][f]=v;if(f==='difficulty')nq[i].points=DIFFICULTY_POINTS[v]??nq[i].points;setForm({...form,questions:nq})};
  const updateHint=(qi,hi,v)=>{const nq=[...form.questions];nq[qi].hints[hi]=v;setForm({...form,questions:nq})};
  const handleStartCreate=()=>{setEditingSetId(null);setForm(blankForm());setView('create')};
  const handleEditSet=(set)=>{
    setEditingSetId(set._id);
    setForm({
      title:set.title||'',
      weekNumber:set.weekNumber||1,
      deadline:set.deadline?new Date(set.deadline).toISOString().slice(0,10):'',
      targetLevel:set.targetLevel||'Both',
      questions:(set.questions||[]).map(q=>({
        ...initialQuestionState,
        ...q,
        hints:(q.hints&&q.hints.length)?q.hints:[''],
        leetcodeSlug:'',
        solutions:q.solutions||[],
        testCases:(q.testCases||[]).map(tc=>({label:tc.label||'',args:JSON.stringify(tc.args??[]),expected:cleanExpected(tc.expected??'')})),
      })),
    });
    setView('create');
  };

  const executePublish = () => {
    const fq = form.questions.map(q => ({
      ...q,
      solutions: prepareSolutions(q.solutions || []),
      testCases: prepareTestCases(q.testCases || [])
    }));
    if (editingSetId) {
      updateSetMutation.mutate({ id: editingSetId, body: { ...form, questions: fq } });
    } else {
      createSetMutation.mutate({ ...form, questions: fq });
    }
    setPublishWarning(null);
    setPublishError(null);
  };

  const handlePublish = (e) => {
    e.preventDefault();
    
    // Find duplicates
    const existingSets = setsQuery.data || [];
    let errorDup = null;
    let warningDup = null;
    const now = new Date();

    for (const currentQ of form.questions) {
      const qTitle = currentQ.title?.trim().toLowerCase();
      if (!qTitle) continue;

      for (const set of existingSets) {
        if (set._id === editingSetId) continue; // Skip the set currently being edited
        
        const hasDuplicate = (set.questions || []).some(
          existingQ => existingQ.title?.trim().toLowerCase() === qTitle
        );

        if (hasDuplicate) {
          const setDeadline = new Date(set.deadline);
          const isPassed = setDeadline < now;

          if (!isPassed && !errorDup) {
            errorDup = { questionTitle: currentQ.title, setTitle: set.title, deadline: setDeadline.toLocaleDateString() };
          } else if (isPassed && !warningDup) {
            warningDup = { questionTitle: currentQ.title, setTitle: set.title };
          }
        }
      }
    }

    if (errorDup) {
      setPublishError(errorDup);
      return;
    }
    
    if (warningDup) {
      setPublishWarning(warningDup);
      return;
    }

    executePublish();
  };

  const handleCreateChallengeSubmit=(e)=>{e.preventDefault();createChallengeMutation.mutate({...createChallengeForm,solutions:prepareSolutions(createChallengeForm.solutions),testCases:prepareTestCases(createChallengeForm.testCases)})};
  const handleUpdateChallengeSubmit=(e)=>{e.preventDefault();if(!editingChallenge)return;updateChallengeMutation.mutate({id:editingChallenge._id,body:{title:editingChallenge.title,description:editingChallenge.description,link:editingChallenge.link||'',difficulty:editingChallenge.difficulty,points:Number(editingChallenge.points),category:editingChallenge.category,solutions:prepareSolutions(editingChallenge.solutions||[]),functionName:editingChallenge.functionName||'',params:editingChallenge.params||[],returnType:editingChallenge.returnType||'',testCases:prepareTestCases(editingChallenge.testCases||[])}})};

  const renderSolutionEditor = ({ editorKey, solutions = [], onChange }) => {
    const selectedLang = solutionLangByKey[editorKey] || solutions.find((s) => s.code?.trim())?.langSlug || 'javascript';
    const selectedCode = solutions.find((s) => s.langSlug === selectedLang)?.code || '';

    return (
      <div className="md:col-span-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="field-label text-[10px] mb-0">Uploaded Solution</label>
          <select
            className="field-select text-xs w-40 py-1"
            value={selectedLang}
            onChange={(e) => setSolutionLangByKey((p) => ({ ...p, [editorKey]: e.target.value }))}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}{opt.version && ` (${opt.version})`}</option>
            ))}
          </select>
        </div>
        <div className="h-[260px] overflow-hidden rounded-xl border border-glass-border bg-black/5 dark:bg-black/20">
          <CodeEditor
            value={selectedCode}
            onChange={(value) => onChange(upsertSolution(solutions, selectedLang, value || ''))}
            language={LANGUAGE_MAP[selectedLang]?.monacoLang ?? selectedLang}
            isDark={true}
            height="260px"
          />
        </div>
        <p className="text-[11px] text-secondary">Paste the optimal solution for the selected language. Blank languages are ignored when saved.</p>
      </div>
    );
  };

  const TestCaseEditor = ({cases,onChange}) => (
    <div className="md:col-span-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="field-label text-[10px] mb-0">Test Cases</label>
        <button type="button" className="text-xs text-accent hover:underline font-bold" onClick={()=>onChange([...(cases||[]),emptyTestCase()])}>+ Add Case</button>
      </div>
      {(!cases||cases.length===0)?<p className="text-xs text-tertiary">No test cases — click Add Case.</p>:(
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {cases.map((tc,i)=>(
            <div key={i} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-start bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-glass-border">
              <div><p className="text-[10px] text-tertiary mb-1">Label</p><input className="field-input text-xs py-1" placeholder="Example 1" value={tc.label} onChange={e=>{const t=[...cases];t[i]={...t[i],label:e.target.value};onChange(t)}}/></div>
              <div><p className="text-[10px] text-tertiary mb-1">Args (JSON array)</p><input className="field-input text-xs py-1 font-mono" placeholder='[[2,7,11,15], 9]' value={tc.args} onChange={e=>{const t=[...cases];t[i]={...t[i],args:e.target.value};onChange(t)}}/></div>
              <div><p className="text-[10px] text-tertiary mb-1">Expected</p><input className="field-input text-xs py-1 font-mono" placeholder='[0,1]' value={tc.expected} onChange={e=>{const t=[...cases];t[i]={...t[i],expected:e.target.value};onChange(t)}}/></div>
              <button type="button" className="mt-5 text-secondary hover:text-red-400 transition-colors" onClick={()=>onChange(cases.filter((_,j)=>j!==i))}><FiTrash2 size={14}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={()=>setView('list')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${view==='list'?'bg-accent text-white':'bg-black/5 dark:bg-white/5 text-secondary hover:text-primary'}`}>Active Sets</button>
        <button onClick={()=>setView('history')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${view==='history'?'bg-accent text-white':'bg-black/5 dark:bg-white/5 text-secondary hover:text-primary'}`}>History</button>
        <button onClick={()=>setView('challenges')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${view==='challenges'||view==='create_challenge'?'bg-accent text-white':'bg-black/5 dark:bg-white/5 text-secondary hover:text-primary'}`}>Manage Challenges</button>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={()=>setImportModalOpen(true)} className="px-4 py-2 rounded-xl text-sm font-bold transition-colors bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 flex items-center gap-2"><FiUploadCloud /> Import</button>
          {view==='challenges'||view==='create_challenge'?(
            <button onClick={()=>setView(view==='create_challenge'?'challenges':'create_challenge')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${view==='create_challenge'?'bg-green-500 text-white':'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
              {view==='create_challenge'?'Back to Challenges':<><FiPlus /> New Challenge</>}
            </button>
          ):(
            <button onClick={handleStartCreate} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${view==='create'?'bg-green-500 text-white':'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}><FiPlus /> Create New Set</button>
          )}
        </div>
      </div>

      {/* Create Set */}
      {view === 'create' && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-6">
          <form onSubmit={handlePublish} className="space-y-6">
            <BaseCard>
              <h2 className="text-xl font-black text-primary">Set Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="field-label">Set Title</label><input required className="field-input" placeholder="e.g. Dynamic Programming Basics" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
                <div><label className="field-label">Target Level</label>
                  <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                    {['Beginner','Intermediate','Both'].map(lvl=>(<button type="button" key={lvl} onClick={()=>setForm({...form,targetLevel:lvl})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${form.targetLevel===lvl?'bg-black/10 dark:bg-white/10 text-primary shadow':'text-tertiary hover:text-secondary'}`}>{lvl}</button>))}
                  </div>
                </div>
                <div><label className="field-label">Week Number</label>
                  <div className="relative"><FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"/><input required type="number" min="1" className="field-input pl-9" value={form.weekNumber} onChange={e=>setForm({...form,weekNumber:Number(e.target.value)})}/></div>
                </div>
                <div><label className="field-label">Deadline</label><input required type="date" min={new Date().toISOString().split('T')[0]} className="field-input" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></div>
              </div>
            </BaseCard>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-primary">Questions ({form.questions.length}/5)</h2>
                {form.questions.length<5&&(<button type="button" onClick={handleAddQuestion} className="text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors flex items-center gap-1"><FiPlus /> Add Question</button>)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <AnimatePresence>
                {form.questions.map((q,i)=>(
                  <motion.div key={i} initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.97}} transition={{duration:0.15}}>
                    <BaseCard className="p-5 space-y-4 relative overflow-hidden group">

                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-primary flex items-center gap-2"><span className="w-6 h-6 rounded bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs text-secondary">{i+1}</span> Question Config</h3>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={()=>setPreviewQuestion(q)} className="flex items-center gap-1.5 text-xs text-secondary hover:text-accent bg-black/5 dark:bg-white/5 hover:bg-accent/10 border border-glass-border hover:border-accent/30 px-2.5 py-1 rounded-lg transition-colors font-semibold"><FiEye size={13}/> Preview</button>
                          {form.questions.length>1&&(<button type="button" onClick={()=>handleRemoveQuestion(i)} className="text-red-400 hover:text-red-300 p-1 ml-1"><FiTrash2 size={16}/></button>)}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-3 bg-purple-500/5 border border-purple-500/20 p-3 rounded-lg flex flex-col md:flex-row gap-3 items-end">
                          <div className="flex-1 w-full"><label className="field-label text-[10px] text-purple-400">Fetch from LeetCode (Slug or URL)</label><input className="field-input text-sm border-purple-500/30 focus:border-purple-500/60" placeholder="e.g. two-sum" value={q.leetcodeSlug||''} onChange={e=>updateQuestion(i,'leetcodeSlug',e.target.value)}/></div>
                          <button type="button" disabled={fetchLeetCodeMutation.isLoading&&fetchLeetCodeMutation.variables?.index===i} onClick={()=>{let slug=q.leetcodeSlug.trim();if(slug.includes('leetcode.com/problems/'))slug=slug.split('leetcode.com/problems/')[1].split('/')[0];if(!slug)return toast.error('Enter a LeetCode slug or URL');fetchLeetCodeMutation.mutate({slug,index:i})}} className="bg-purple-500/20 text-purple-400 font-bold px-4 py-2 rounded-lg text-sm hover:bg-purple-500/30 transition-colors whitespace-nowrap">
                            {fetchLeetCodeMutation.isLoading&&fetchLeetCodeMutation.variables?.index===i?'Fetching...':'Fetch Details'}
                          </button>
                        </div>
                        <div className="md:col-span-2"><label className="field-label text-[10px]">Title</label><input required className="field-input text-sm" value={q.title} onChange={e=>updateQuestion(i,'title',e.target.value)}/></div>
                        <div><label className="field-label text-[10px]">Difficulty</label><select className="field-select text-sm" value={q.difficulty} onChange={e=>updateQuestion(i,'difficulty',e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                        <div><label className="field-label text-[10px]">Points (auto)</label><input disabled type="number" className="field-input text-sm opacity-70 cursor-not-allowed" value={DIFFICULTY_POINTS[q.difficulty]??q.points}/></div>
                        <div><label className="field-label text-[10px]">Tags/Category</label><input className="field-input text-sm" placeholder="e.g. Arrays, Sorting" value={q.category} onChange={e=>updateQuestion(i,'category',e.target.value)}/></div>
                        <div className="md:col-span-3 flex items-center gap-2"><input type="checkbox" id={`order-independent-${i}`} checked={!!q.orderIndependent} onChange={e=>updateQuestion(i,'orderIndependent',e.target.checked)}/><label htmlFor={`order-independent-${i}`} className="text-xs text-secondary cursor-pointer">Order doesn't matter (e.g. Group Anagrams) — ignore array/element order when checking output</label></div>
                        <div className="md:col-span-3"><label className="field-label text-[10px]">Problem Description</label><textarea required rows="3" className="field-textarea text-sm" value={q.description} onChange={e=>updateQuestion(i,'description',e.target.value)}/></div>
                        <div className="md:col-span-3"><label className="field-label text-[10px]">Hints (optional)</label>{q.hints.map((hint,hi)=>(<input key={hi} className="field-input text-sm mb-2" placeholder="Hint..." value={hint} onChange={e=>updateHint(i,hi,e.target.value)}/>))}</div>
                        {renderSolutionEditor({ editorKey: `set-question-${i}`, solutions: q.solutions||[], onChange: v=>updateQuestion(i,'solutions',v) })}
                        <div className="md:col-span-3"><label className="field-label text-[10px]">Solution Function Name</label><input className="field-input text-sm font-mono" placeholder="e.g. twoSum" value={q.functionName||''} onChange={e=>updateQuestion(i,'functionName',e.target.value.trim())}/><SignatureInfo functionName={q.functionName} params={q.params} returnType={q.returnType}/></div>
                        <TestCaseEditor cases={q.testCases||[]} onChange={v=>updateQuestion(i,'testCases',v)}/>
                      </div>
                    </BaseCard>
                  </motion.div>
                ))}
              </AnimatePresence>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {editingSetId&&<button type="button" onClick={()=>{setEditingSetId(null);setForm(blankForm());setView('list')}} className="btn-secondary px-6 py-3 text-sm font-bold">Cancel Edit</button>}
              <button type="submit" disabled={createSetMutation.isLoading||updateSetMutation.isLoading} className="btn-primary w-full md:w-auto px-8 py-3 text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]">{editingSetId?(updateSetMutation.isLoading?'Saving...':'Save Changes'):(createSetMutation.isLoading?'Publishing...':'Publish Question Set & Notify')}</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Active/History Sets */}
      {(view==='list'||view==='history')&&(
        <div className="flex flex-col gap-4">
          {setsQuery.data?.map((set,i)=>{
            const deadlineEnd=new Date(set.deadline);deadlineEnd.setUTCHours(23,59,59,999);
            const isHistory=deadlineEnd<new Date();
            if(view==='list'&&isHistory)return null;
            if(view==='history'&&!isHistory)return null;
            return(
              <motion.div key={set._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
                <BaseCard className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div><h3 className="font-bold text-lg text-primary">{set.title}</h3><p className="text-xs text-secondary font-mono flex items-center gap-2 mt-1"><FiTarget className="text-accent"/> Target: {set.targetLevel} <span className="text-black/20 dark:text-white/20">|</span> <FiClock className="text-orange-400"/> Due: {new Date(set.deadline).toLocaleDateString()}</p></div>
                    <span className="bg-black/5 dark:bg-white/5 border border-glass-border px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">Week {set.weekNumber}</span>
                  </div>
                  <div className="h-px bg-glass-border"/>
                  <div className="space-y-2">
                    {set.questions.map((q,qi)=>{
                      const dc=q.difficulty==='Easy'?'text-green-400':q.difficulty==='Medium'?'text-yellow-400':'text-red-400';
                      return(<div key={qi} className="flex justify-between items-center text-sm p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors border border-transparent hover:border-glass-border"><span className="text-secondary truncate pr-2 max-w-[50%] font-medium">{q.title}</span><div className="flex items-center gap-3 text-xs font-bold"><span className={dc}>{q.difficulty}</span><span className="text-accent flex items-center gap-1"><FiZap size={10}/> {q.points} XP</span><button onClick={()=>setPreviewQuestion(q)} className="flex items-center gap-1 text-tertiary hover:text-accent transition-colors font-semibold"><FiEye size={12}/>Preview</button></div></div>)
                    })}
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-glass-border">
                    <button onClick={()=>handleEditSet(set)} className="btn-secondary py-1.5 px-4 text-xs font-bold hover:bg-accent/10 hover:text-accent transition-colors">Edit</button>
                    <button onClick={()=>setDeleteSetTarget(set)} className="btn-secondary py-1.5 px-4 text-xs font-bold hover:bg-red-500/10 hover:text-red-400 transition-colors">Delete</button>
                  </div>
                </BaseCard>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Manage Challenges */}
      {view==='challenges'&&(
        <div className="space-y-6"><div className="macos-glass p-6">
          <h2 className="text-section-title font-bold mb-4 text-primary">Manage Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"/><input className="field-input pl-10" placeholder="Search challenges..." value={challengeFilters.search} onChange={e=>setChallengeFilters(p=>({...p,search:e.target.value}))}/></div>
            <select className="field-select" value={challengeFilters.range} onChange={e=>setChallengeFilters(p=>({...p,range:e.target.value}))}><option value="all">All Time</option><option value="weekly">Last 7 Days</option><option value="monthly">Last 30 Days</option></select>
          </div>
          {manageChallengesQuery.isLoading?<div className="space-y-3"><SkeletonCard/><SkeletonCard/></div>
          :(manageChallengesQuery.data||[]).length===0?<EmptyState title="No challenges match" description="Adjust filters or create a new challenge."/>
          :(<div className="space-y-3">{(manageChallengesQuery.data||[]).map(ch=>(
            <div key={ch._id} className="border border-glass-border rounded-xl p-4 flex flex-wrap gap-3 justify-between items-start hover:border-accent/20 transition-all duration-300 bg-black/[0.01] dark:bg-white/[0.01]">
              <div><h3 className="font-semibold text-primary">{ch.title}</h3><p className="text-secondary text-sm">{ch.difficulty} - {ch.points} XP - {ch.category}</p></div>
              <div className="flex gap-2">
                <button className="btn-secondary py-1.5 px-4 text-xs font-bold hover:bg-accent/10 hover:text-accent transition-colors" onClick={()=>setEditingChallenge({...ch,solutions:ch.solutions||[],testCases:(ch.testCases||[]).map(tc=>({...tc,args:JSON.stringify(tc.args??[]),expected:cleanExpected(tc.expected)}))})}>Edit</button>
                <button className="btn-secondary py-1.5 px-4 text-xs font-bold hover:bg-red-500/10 hover:text-red-400 transition-colors" onClick={()=>setDeleteTarget(ch)}>Delete</button>
              </div>
            </div>
          ))}</div>)}
        </div></div>
      )}

      {/* Create Challenge */}
      {view==='create_challenge'&&(
        <div className="macos-glass p-8 max-w-2xl mx-auto"><div className="space-y-6">
          <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 mb-8">
            <label className="field-label text-accent font-bold">Import from LeetCode</label>
            <div className="flex gap-2"><input className="field-input border-accent/20" placeholder="Paste LeetCode URL or slug" value={leetcodeInput} onChange={e=>setLeetcodeInput(e.target.value)}/><button type="button" className="btn-secondary whitespace-nowrap" onClick={handleChallengeAutoFill} disabled={isFetchingLC}>{isFetchingLC?'Fetching...':'Auto-fill'}</button></div>
          </div>
          <form onSubmit={handleCreateChallengeSubmit} className="space-y-4">
            <h2 className="text-section-title font-bold text-primary">Create Challenge</h2>
            <div><label className="field-label">Title</label><input className="field-input" required value={createChallengeForm.title} onChange={e=>setCreateChallengeForm(p=>({...p,title:e.target.value}))}/></div>
            <div><label className="field-label">Description (HTML supported)</label><textarea className="field-textarea" required rows={8} value={createChallengeForm.description} onChange={e=>setCreateChallengeForm(p=>({...p,description:e.target.value}))}/></div>
            <div><label className="field-label">Original Question Link</label><input className="field-input" type="url" placeholder="https://leetcode.com/problems/..." value={createChallengeForm.link} onChange={e=>setCreateChallengeForm(p=>({...p,link:e.target.value}))}/></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="field-label">Difficulty</label><select className="field-select" value={createChallengeForm.difficulty} onChange={e=>setCreateChallengeForm(p=>({...p,difficulty:e.target.value,points:DIFFICULTY_POINTS[e.target.value]??p.points}))}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
              <div><label className="field-label">Points (auto)</label><input disabled className="field-input opacity-70 cursor-not-allowed" type="number" value={DIFFICULTY_POINTS[createChallengeForm.difficulty]??createChallengeForm.points}/></div>
              <div><label className="field-label">Category</label><input className="field-input" required value={createChallengeForm.category} onChange={e=>setCreateChallengeForm(p=>({...p,category:e.target.value}))}/></div>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" id="create-order-independent" checked={!!createChallengeForm.orderIndependent} onChange={e=>setCreateChallengeForm(p=>({...p,orderIndependent:e.target.checked}))}/><label htmlFor="create-order-independent" className="text-xs text-secondary cursor-pointer">Order doesn't matter (e.g. Group Anagrams) — ignore array/element order when checking output</label></div>
            {createChallengeForm.tags.length>0&&(<div><label className="field-label">Topic Tags</label><div className="flex flex-wrap gap-2">{createChallengeForm.tags.map(tag=>(<span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent/10 text-accent border border-accent/20">{tag}<button type="button" className="ml-0.5 hover:text-red-400 transition-colors" onClick={()=>setCreateChallengeForm(p=>({...p,tags:p.tags.filter(t=>t!==tag)}))}><FiX size={12}/></button></span>))}</div></div>)}
            {createChallengeForm.codeSnippets.length>0&&(<div><label className="field-label">Starter Code ({createChallengeForm.codeSnippets.length} languages)</label><div className="flex gap-2 mb-2 flex-wrap">{createChallengeForm.codeSnippets.map(s=>(<button key={s.langSlug} type="button" className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${snippetLang===s.langSlug?'bg-accent text-white':'bg-white/5 text-secondary hover:text-primary'}`} onClick={()=>setSnippetLang(s.langSlug)}>{s.lang}</button>))}</div><pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono"><code>{createChallengeForm.codeSnippets.find(s=>s.langSlug===snippetLang)?.code||'Select a language above'}</code></pre></div>)}
            {renderSolutionEditor({ editorKey: "create-challenge", solutions: createChallengeForm.solutions||[], onChange: v=>setCreateChallengeForm(p=>({...p,solutions:v})) })}
            <div><label className="field-label">Solution Function Name</label><input className="field-input font-mono" placeholder="e.g. twoSum" value={createChallengeForm.functionName} onChange={e=>setCreateChallengeForm(p=>({...p,functionName:e.target.value.trim()}))}/><SignatureInfo functionName={createChallengeForm.functionName} params={createChallengeForm.params} returnType={createChallengeForm.returnType}/></div>
            <TestCaseEditor cases={createChallengeForm.testCases} onChange={v=>setCreateChallengeForm(p=>({...p,testCases:v}))}/>
            <button type="submit" disabled={createChallengeMutation.isLoading} className="btn-primary w-full shadow-[0_0_20px_rgba(168,85,247,0.4)]">{createChallengeMutation.isLoading?'Creating...':'Create Challenge'}</button>
          </form>
        </div></div>
      )}

      {/* Edit Challenge Modal */}
      {editingChallenge&&(
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-fadeIn">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="macos-glass w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-glass-border pb-2"><h3 className="text-section-title font-bold text-primary">Edit Challenge</h3><button onClick={()=>setEditingChallenge(null)} className="text-tertiary hover:text-primary"><FiX size={20}/></button></div>
            <form onSubmit={handleUpdateChallengeSubmit} className="space-y-4">
              <div><label className="field-label text-xs">Title</label><input className="field-input text-sm" required value={editingChallenge.title} onChange={e=>setEditingChallenge(p=>({...p,title:e.target.value}))}/></div>
              <div><label className="field-label text-xs">Description</label><textarea className="field-textarea text-sm" required rows="4" value={editingChallenge.description} onChange={e=>setEditingChallenge(p=>({...p,description:e.target.value}))}/></div>
              <div><label className="field-label text-xs">Original Question Link</label><input className="field-input text-sm" type="url" value={editingChallenge.link||''} onChange={e=>setEditingChallenge(p=>({...p,link:e.target.value}))}/></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="field-label text-xs">Difficulty</label><select className="field-select text-sm" value={editingChallenge.difficulty} onChange={e=>setEditingChallenge(p=>({...p,difficulty:e.target.value,points:DIFFICULTY_POINTS[e.target.value]??p.points}))}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                <div><label className="field-label text-xs">Points (auto)</label><input disabled className="field-input text-sm opacity-70 cursor-not-allowed" type="number" value={DIFFICULTY_POINTS[editingChallenge.difficulty]??editingChallenge.points}/></div>
                <div><label className="field-label text-xs">Category</label><input className="field-input text-sm" required value={editingChallenge.category} onChange={e=>setEditingChallenge(p=>({...p,category:e.target.value}))}/></div>
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" id="edit-order-independent" checked={!!editingChallenge.orderIndependent} onChange={e=>setEditingChallenge(p=>({...p,orderIndependent:e.target.checked}))}/><label htmlFor="edit-order-independent" className="text-xs text-secondary cursor-pointer">Order doesn't matter (e.g. Group Anagrams) — ignore array/element order when checking output</label></div>
              {renderSolutionEditor({ editorKey: "edit-challenge", solutions: editingChallenge.solutions||[], onChange: v=>setEditingChallenge(p=>({...p,solutions:v})) })}
              <div><label className="field-label text-xs">Solution Function Name</label><input className="field-input text-sm font-mono" placeholder="e.g. twoSum" value={editingChallenge.functionName||''} onChange={e=>setEditingChallenge(p=>({...p,functionName:e.target.value.trim()}))}/><SignatureInfo functionName={editingChallenge.functionName} params={editingChallenge.params} returnType={editingChallenge.returnType}/></div>
              <TestCaseEditor cases={editingChallenge.testCases||[]} onChange={v=>setEditingChallenge(p=>({...p,testCases:v}))}/>
              <div className="flex justify-end gap-2 border-t border-glass-border pt-3">
                <button type="button" className="btn-secondary py-2 px-4 text-sm font-bold" onClick={()=>setEditingChallenge(null)}>Cancel</button>
                <button type="submit" disabled={updateChallengeMutation.isLoading} className="btn-primary py-2 px-6 text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]">{updateChallengeMutation.isLoading?'Saving...':'Save Changes'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {deleteTarget&&<ConfirmDialog open={true} title="Delete Challenge" description={`Delete "${deleteTarget.title}"?`} onConfirm={()=>deleteChallengeMutation.mutate(deleteTarget._id)} onCancel={()=>setDeleteTarget(null)}/>}

      {/* Question Preview Modal */}
      <AnimatePresence>
        {previewQuestion && (
          <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
        )}
      </AnimatePresence>

      {deleteSetTarget&&<ConfirmDialog open={true} title="Delete Question Set" description={`Delete "${deleteSetTarget.title}" and its generated challenges? This cannot be undone.`} onConfirm={()=>deleteSetMutation.mutate(deleteSetTarget._id)} onCancel={()=>setDeleteSetTarget(null)}/>}

      {/* Import Modal */}
      <AnimatePresence>
        {importModalOpen&&(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} className="w-full max-w-md">
              <BaseCard className="p-6 space-y-4">
                <div className="flex justify-between items-center mb-2"><h3 className="text-lg font-black text-primary flex items-center gap-2"><FiUploadCloud className="text-purple-400"/> Import Questions</h3><button onClick={()=>setImportModalOpen(false)} className="text-tertiary hover:text-primary"><FiX size={20}/></button></div>
                <p className="text-sm text-secondary">Upload a <strong>.json</strong>, <strong>.csv</strong>, or <strong>.docx</strong> file to bulk import challenges.</p>
                <div className="border-2 border-dashed border-glass-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400/50 hover:bg-purple-400/5 transition-all text-center" onClick={()=>fileInputRef.current?.click()}>
                  <FiUploadCloud className="text-4xl text-tertiary mb-3"/>
                  <p className="font-bold text-primary mb-1">Click or drag file to upload</p>
                  <p className="text-xs text-tertiary">Supported: JSON, CSV, DOCX</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv,.docx" onChange={handleFileChange}/>
                </div>
                {importMutation.isLoading&&<div className="text-center text-sm text-purple-400 animate-pulse font-bold">Importing...</div>}
              </BaseCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Dialogs */}
      {publishError && (
        <ConfirmDialog 
          open={true} 
          title="Duplicate Question Detected" 
          description={`This particular question '${publishError.questionTitle}' is already published in the set '${publishError.setTitle}' with deadline '${publishError.deadline}'. You cannot upload it again.`} 
          onConfirm={() => setPublishError(null)} 
          onCancel={() => setPublishError(null)}
          confirmLabel="OK"
          cancelLabel="Close"
        />
      )}

      {publishWarning && (
        <ConfirmDialog 
          open={true} 
          title="Question Already Uploaded" 
          description={`The question '${publishWarning.questionTitle}' was already uploaded on the set '${publishWarning.setTitle}'. Do you want to upload it again?`} 
          onConfirm={executePublish} 
          onCancel={() => setPublishWarning(null)}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
        />
      )}
    </div>
  );
};

export default QuestionSetsTab;
