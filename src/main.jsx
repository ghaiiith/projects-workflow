import React, {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  LayoutDashboard, FolderKanban, ClipboardCheck, Megaphone, Scale, Wallet, UsersRound,
  ShieldCheck, Settings2, Search, Plus, Bell, ChevronLeft, ChevronDown, Menu, X,
  CheckCircle2, Circle, Clock3, AlertTriangle, FileText, Download, UploadCloud,
  Building2, MapPin, CalendarDays, BadgeCheck, ArrowUpLeft, LogOut, Filter, Activity,
  Send, RotateCcw, Ban, Landmark, Hash, CircleHelp, ExternalLink, FileCheck2, Layers3,
  Banknote, ReceiptText, Gavel, ArrowRightLeft, Eye, ListChecks, Printer
} from 'lucide-react';
import './styles.css';

const formatMoney=x=>Number(x||0).toLocaleString('en-US',{maximumFractionDigits:0});
const parseDate=x=>{const s=String(x).replace(' ','T');return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(s)?s:s.includes('T')?s+'Z':s+'T00:00:00Z');};
const formatDate=x=>x?new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Baghdad'}).format(parseDate(x)):'—';
const dateTime=x=>x?new Intl.DateTimeFormat('ar-IQ',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Baghdad'}).format(parseDate(x)):'—';
const cash=x=>formatMoney(x)+' د.ع';
const navItems=[
 {id:'dashboard',label:'نظرة عامة',icon:LayoutDashboard,group:'الرئيسية'},
 {id:'projects',label:'سجل المشاريع',icon:FolderKanban,group:'الرئيسية'},
 {id:'reviews',label:'الموافقات واللجان',icon:ClipboardCheck,group:'الرئيسية'},
 {id:'tenders',label:'الإعلانات والعطاءات',icon:Megaphone,group:'العمليات'},
 {id:'awards',label:'الإحالة والتعاقد',icon:Gavel,group:'العمليات'},
 {id:'finance',label:'السلف والصرف',icon:Wallet,group:'العمليات'},
 {id:'users',label:'المستخدمون واللجان',icon:UsersRound,group:'الإدارة'},
 {id:'audit',label:'سجل التدقيق',icon:ShieldCheck,group:'الإدارة'},
 {id:'regulations',label:'المراجع والإجراءات',icon:FileText,group:'الإدارة'}
];
const stageTone={draft:'muted',engineering_review:'amber',committee_review:'violet',planning_approval:'violet',announcement:'sky',tendering:'sky',bid_opening:'sky',bid_analysis:'violet',award_approval:'violet',awarded:'mint',contracting:'mint',execution:'mint',completed:'green',rejected:'red'};
const advanceNames={requested:'طلب جديد',technical_verified:'تدقيق فني',financial_verified:'تدقيق مالي',authorized:'مصرّح بالصرف',paid:'مصروفة',rejected:'مرفوضة'};
const governors=['بغداد','نينوى','صلاح الدين','الأنبار','ديالى','كركوك','بابل','كربلاء','النجف','القادسية','واسط','ذي قار','المثنى','ميسان','البصرة','دهوك','أربيل','السليمانية','حلبجة'];
let authToken=localStorage.getItem('rpf_token')||'';
async function api(url,opts={}){
 const isForm=opts.body instanceof FormData;
 const headers={...(isForm?{}:{'Content-Type':'application/json'}),...(authToken?{Authorization:'Bearer '+authToken}:{}),...opts.headers};
 const response=await fetch('/api'+url,{...opts,headers});
 if(!response.ok){
  let payload={};try{payload=await response.json();}catch{}
  throw new Error(payload.error||'تعذر إكمال الطلب ('+response.status+')');
 }
 if(opts.blob)return await response.blob();
 return response.json();
}
const Button=({children,variant='primary',icon:Icon,loading,...props})=><button className={'btn btn-'+variant} disabled={loading||props.disabled} {...props}>{Icon&&<Icon size={17}/>}<span>{loading?'جاري التنفيذ...':children}</span></button>;
const Badge=({children,tone='muted'})=><span className={'badge badge-'+tone}>{children}</span>;
const Label=({title,children,hint})=><label className="field"><span>{title}{hint&&<small> {hint}</small>}</span>{children}</label>;
const Loading=()=> <div className="center-state"><span className="spinner"/><span>جارٍ تحميل البيانات...</span></div>;
const Empty=({icon:Icon=FolderKanban,title='لا توجد بيانات',text='لا توجد عناصر لعرضها حالياً'})=><div className="empty"><div className="empty-icon"><Icon size={30}/></div><b>{title}</b><p>{text}</p></div>;
const Modal=({title,close,children,subtitle})=><div className="modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={close}><X size={20}/></button></div><div className="modal-body">{children}</div></div></div>;
const stageName=(meta,id)=>meta.stages.find(s=>s.id===id)?.name||id;
const roleName=(meta,id)=>meta.roles[id]||id;
const SectionTitle=({icon:Icon,title,subtitle,children})=><div className="section-title"><div><h2>{Icon&&<Icon size={20}/>} {title}</h2>{subtitle&&<p>{subtitle}</p>}</div><div>{children}</div></div>;

function Login({onLogin}){
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e){
  e.preventDefault();setBusy(true);setError('');
  try{const result=await api('/auth/login',{method:'POST',body:JSON.stringify({username,password})});authToken=result.token;localStorage.setItem('rpf_token',result.token);onLogin(result.user);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="login-layout">
  <div className="login-hero">
   <div className="login-mark"><Landmark size={27}/><span>جمهورية العراق</span></div>
   <div className="login-hero-content"><div className="eyebrow light">PROJ / GOVERNANCE SYSTEM</div>
    <h1>من الفكرة، إلى<br/><em>الأثر على الأرض.</em></h1>
    <p>منصة مؤسسية موحدة لإدارة مشاريع الإعمار، من متطلبات الإدراج إلى التعاقد والتنفيذ والصرف، بمسار رقابي موثق لكل قرار.</p>
    <div className="hero-graphic"><div className="hero-graphic-head">مسار حوكمة متكامل</div><div className="hero-track">{['إدراج','تدقيق','إحالة','تنفيذ'].map((t,i)=><div key={t}><span>{String(i+1).padStart(2,'0')}</span><b>{t}</b></div>)}</div></div>
   </div>
   <span className="hero-foot">صندوق إعمار المحافظات الأكثر فقراً · مديرية الشؤون الهندسية والفنية</span>
  </div>
  <div className="login-pane"><div className="login-card"><div className="brand-icon"><Layers3 size={27}/></div><div className="eyebrow">بوابة الموظفين</div><h2>تسجيل الدخول</h2><p>أدخل بيانات حسابك الوظيفي للمتابعة إلى مساحة العمل.</p>
    <form onSubmit={submit}><Label title="اسم المستخدم"><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="اسم المستخدم" autoComplete="username" required/></Label><Label title="كلمة المرور"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password" required/></Label>
     {error&&<div className="inline-error"><AlertTriangle size={17}/>{error}</div>}<Button type="submit" loading={busy} icon={ArrowUpLeft}>دخول إلى المنظومة</Button></form>
    <div className="login-note"><ShieldCheck size={16}/> الحسابات والصلاحيات تدار من مسؤول المنظومة. لا توجد كلمة مرور افتراضية.</div>
   </div></div>
 </div>;
}
function ProjectForm({project,onSave,cancel,notify}){
 const year=new Date().getFullYear();
 const [form,setForm]=useState(project?{...project}:{title:'',governorate:'',district:'',beneficiary:'',executing_entity:'',sector:'خدمات بلدية',summary:'',estimated_cost:'',total_cost:'',fiscal_year:year,procurement_method:'مناقصة عامة'});
 const [busy,setBusy]=useState(false);
 const update=(key,value)=>setForm(s=>({...s,[key]:value}));
 async function save(e){
  e.preventDefault();setBusy(true);
  try{const result=await api(project?'/projects/'+project.id:'/projects',{method:project?'PATCH':'POST',body:JSON.stringify(form)});onSave(result);}
  catch(e){notify(e.message,'error');}finally{setBusy(false);}
 }
 return <form className="project-form" onSubmit={save}>
  <div className="form-section-label"><span>01</span> معلومات المشروع</div>
  <Label title="اسم المشروع" hint="ضمن قضاء واحد وموقع عمل واحد"><input value={form.title} onChange={e=>update('title',e.target.value)} placeholder="مثال: تأهيل شبكة مياه حيّ..." required minLength={8}/></Label>
  <div className="form-grid two">
   <Label title="المحافظة"><select value={form.governorate} onChange={e=>update('governorate',e.target.value)} required><option value="">اختر المحافظة</option>{governors.map(g=><option key={g}>{g}</option>)}</select></Label>
   <Label title="القضاء / موقع العمل"><input value={form.district} onChange={e=>update('district',e.target.value)} placeholder="القضاء" required/></Label>
  </div>
  <div className="form-grid two"><Label title="الجهة المستفيدة"><input value={form.beneficiary} onChange={e=>update('beneficiary',e.target.value)} placeholder="المديرية / الدائرة" required/></Label><Label title="الجهة المنفذة"><input value={form.executing_entity} onChange={e=>update('executing_entity',e.target.value)} placeholder="الجهة المنفذة (إن عُرفت)"/></Label></div>
  <div className="form-grid two"><Label title="القطاع"><select value={form.sector} onChange={e=>update('sector',e.target.value)}>{['خدمات بلدية','ماء','كهرباء','طرق وجسور','صحة','تربية','إسكان','صرف صحي','بيئة','قطاعات أخرى'].map(x=><option key={x}>{x}</option>)}</select></Label><Label title="السنة المالية"><input type="number" min="2020" max="2100" value={form.fiscal_year} onChange={e=>update('fiscal_year',e.target.value)} required/></Label></div>
  <Label title="وصف المشروع وأهدافه"><textarea rows="3" value={form.summary} onChange={e=>update('summary',e.target.value)} placeholder="الحاجة التنموية، نطاق الأعمال، الأثر المتوقع..."/></Label>
  <div className="form-section-label"><span>02</span> المعلومات المالية والتعاقدية</div>
  <div className="form-grid two"><Label title="الكلفة التخمينية (دينار عراقي)"><input type="number" min="1" step="1" value={form.estimated_cost} onChange={e=>update('estimated_cost',e.target.value)} placeholder="0" required/></Label><Label title="الكلفة الكلية (دينار عراقي)"><input type="number" min="1" step="1" value={form.total_cost} onChange={e=>update('total_cost',e.target.value)} placeholder="0" required/></Label></div>
  <Label title="أسلوب التعاقد المقترح"><select value={form.procurement_method} onChange={e=>update('procurement_method',e.target.value)}>{['مناقصة عامة','مناقصة محدودة','مناقصة بمرحلتين','دعوة مباشرة','عطاء واحد','اتفاق إطاري','غير محدد بعد'].map(x=><option key={x}>{x}</option>)}</select></Label>
  <div className="info-line"><CircleHelp size={17}/> اختيار أسلوب غير المناقصة العامة يخضع للمبررات والموافقات المقررة في تعليمات 2025.</div>
  <div className="form-actions"><Button variant="ghost" type="button" onClick={cancel}>إلغاء</Button><Button type="submit" icon={project?CheckCircle2:Plus} loading={busy}>{project?'حفظ التعديلات':'إنشاء مسودة المشروع'}</Button></div>
 </form>;
}
function App(){
 const [user,setUser]=useState(null),[meta,setMeta]=useState(null),[page,setPage]=useState('dashboard'),[sidebar,setSidebar]=useState(false);
 const [stats,setStats]=useState(null),[projects,setProjects]=useState([]),[current,setCurrent]=useState(null),[selected,setSelected]=useState(null);
 const [users,setUsers]=useState([]),[committees,setCommittees]=useState([]),[audit,setAudit]=useState([]);
 const [modal,setModal]=useState(null),[toast,setToast]=useState(null),[loading,setLoading]=useState(true),[refreshId,setRefreshId]=useState(0);
 const notify=(message,type='success')=>{setToast({message,type});setTimeout(()=>setToast(null),5500);};
 const reload=()=>setRefreshId(s=>s+1);
 function logout(){authToken='';localStorage.removeItem('rpf_token');setUser(null);setCurrent(null);setSelected(null);setPage('dashboard');}
 useEffect(()=>{if(!authToken){setLoading(false);return;}api('/me').then(x=>setUser(x.user)).catch(logout).finally(()=>setLoading(false));},[]);
 useEffect(()=>{if(!user)return;api('/meta').then(setMeta).catch(e=>notify(e.message,'error'));},[user]);
 useEffect(()=>{
  if(!user||!meta)return;
  Promise.all([api('/dashboard'),api('/projects'),api('/committees')]).then(([a,b,c])=>{setStats(a);setProjects(b);setCommittees(c);}).catch(e=>notify(e.message,'error'));
  if(user.role==='admin')api('/users').then(setUsers).catch(()=>{});
  if(['admin','auditor'].includes(user.role))api('/audits').then(setAudit).catch(()=>{});
  if(selected)api('/projects/'+selected).then(setCurrent).catch(e=>notify(e.message,'error'));
 },[user,meta,refreshId,selected]);
 function openProject(id){setSelected(id);setPage('project');setSidebar(false);}
 function navigate(id){setPage(id);setSelected(null);setCurrent(null);setSidebar(false);}
 function savedProject(result){setModal(null);reload();notify('تم حفظ المشروع بنجاح');openProject(result.id);}
 if(loading)return <Loading/>;
 if(!user)return <Login onLogin={setUser}/>;
 if(!meta)return <Loading/>;
 const choosePage=(id)=>{navigate(id);};
 const filteredNav=navItems.filter(i=>i.id!=='users'||user.role==='admin').filter(i=>i.id!=='audit'||['admin','auditor'].includes(user.role));
 const pageTitle={dashboard:'الرئيسية',projects:'سجل المشاريع',reviews:'الموافقات واللجان',tenders:'الإعلانات والعطاءات',awards:'الإحالة والتعاقد',finance:'السلف والصرف',users:'المستخدمون واللجان',audit:'سجل التدقيق',regulations:'المراجع والإجراءات',project:current?.title||'ملف المشروع'}[page];
 return <div className="app-shell">
  <div className={'sidebar-backdrop '+(sidebar?'show':'')} onClick={()=>setSidebar(false)}/>
  <aside className={'sidebar '+(sidebar?'open':'')}>
   <div className="side-brand"><div className="side-brand-icon"><Landmark size={25}/></div><div><b>صندوق الإعمار</b><small>إدارة المشاريع الحكومية</small></div></div>
   <div className="side-meta"><span className="dot"/> المنظومة الداخلية <span className="version">V 0.1</span></div>
   <nav>{[...new Set(filteredNav.map(x=>x.group))].map(group=><div className="nav-group" key={group}><div className="nav-head">{group}</div>{filteredNav.filter(x=>x.group===group).map(item=><button key={item.id} onClick={()=>choosePage(item.id)} className={'nav-link '+(page===item.id||(page==='project'&&item.id==='projects')?'active':'')}><item.icon size={19}/><span>{item.label}</span>{page===item.id&&<span className="nav-active-dot"/>}</button>)}</div>)}</nav>
   <div className="sidebar-bottom"><div className="user-chip"><div className="user-avatar">{user.name?.[0]||'م'}</div><div><strong>{user.name}</strong><span>{roleName(meta,user.role)}</span></div></div><button className="logout" onClick={logout}><LogOut size={18}/> تسجيل الخروج</button></div>
  </aside>
  <main className="main">
   <header className="topbar"><div className="topbar-start"><button className="mobile-nav icon-button" onClick={()=>setSidebar(true)}><Menu size={21}/></button><div className="breadcrumb"><span>مساحة العمل</span><ChevronLeft size={15}/><strong>{page==='project'?'ملف المشروع':pageTitle}</strong></div></div>
    <div className="topbar-end"><span className="session-date">{new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Baghdad'}).format(new Date())}</span><span className="topbar-separator"/><div className="avatar-mini" title={user.name}>{user.name?.[0]||'م'}</div></div></header>
   <div className="main-content">
    {page==='dashboard'&&<Dashboard stats={stats} projects={projects} meta={meta} navigate={choosePage} openProject={openProject} create={()=>setModal('project')}/>}
    {page==='projects'&&<Projects projects={projects} meta={meta} openProject={openProject} create={()=>setModal('project')} user={user}/>}
    {page==='project'&&<ProjectDetail p={current} meta={meta} user={user} committees={committees} notify={notify} reload={reload} goBack={()=>navigate('projects')} onEdit={()=>setModal('edit')}/>}
    {['reviews','tenders','awards','finance'].includes(page)&&<WorkQueue kind={page} projects={projects} meta={meta} openProject={openProject} stats={stats}/>}
    {page==='users'&&<UserManagement users={users} committees={committees} meta={meta} notify={notify} reload={reload}/>}
    {page==='audit'&&<AuditPage audits={audit} meta={meta} openProject={openProject}/>}
    {page==='regulations'&&<Regulations meta={meta}/>}
   </div>
  </main>
  {modal&&<Modal title={modal==='edit'?'تعديل بيانات المشروع':'إدراج مشروع جديد'} subtitle="سجلّ موحّد للبيانات الأساسية والكلف والجهات المعنية" close={()=>setModal(null)}><ProjectForm project={modal==='edit'?current:null} onSave={savedProject} cancel={()=>setModal(null)} notify={notify}/></Modal>}
  {toast&&<div className={'toast '+(toast.type==='error'?'toast-error':'')}><span>{toast.type==='error'?<AlertTriangle size={20}/>:<CheckCircle2 size={20}/>}</span>{toast.message}<button onClick={()=>setToast(null)}><X size={17}/></button></div>}
 </div>;
}
function Dashboard({stats,projects,meta,navigate,openProject,create}){
 if(!stats)return <Loading/>;
 const cards=[{t:'إجمالي المشاريع',v:stats.total,sub:'جميع مشاريع المنظومة',icon:FolderKanban,tone:'blue'}, {t:'قيد الإجراء',v:stats.tasks,sub:'بانتظار المتابعة والاعتماد',icon:Activity,tone:'amber'}, {t:'الكلفة التخمينية',v:formatMoney(stats.totalEstimated),sub:'دينار عراقي',icon:Landmark,tone:'violet'}, {t:'السلف قيد المعالجة',v:stats.pendingAdvances,sub:'طلبات لم تصرف بعد',icon:ReceiptText,tone:'mint'}];
 const maxCount=Math.max(1,...(stats.byStatus||[]).map(x=>x.n));
 return <><div className="page-intro"><div><div className="eyebrow">PROJECT OPERATIONS / OVERVIEW</div><h1>لوحة قيادة المشاريع</h1><p>نظرة مركزية على دورة حياة المشاريع، القرارات والمخصصات المالية.</p></div><Button icon={Plus} onClick={create}>إدراج مشروع جديد</Button></div>
  <div className="stats-grid">{cards.map((c,i)=><div className="stat-card" key={c.t}><div className={'stat-icon stat-'+c.tone}><c.icon size={22}/></div><div className="stat-value">{c.v}</div><div className="stat-title">{c.t}</div><div className="stat-sub">{c.sub}</div></div>)}</div>
  <div className="dashboard-columns"><section className="panel"><SectionTitle icon={Layers3} title="توزيع المشاريع حسب المراحل" subtitle="متابعة تراكم الطلبات على مسار العمل"/><div className="distribution">{stats.byStatus.length?stats.byStatus.map(s=><div className="distribution-row" key={s.status}><div><span>{stageName(meta,s.status)}</span><b>{s.n}</b></div><div className="bar-rail"><div className={'bar-fill '+(stageTone[s.status]||'muted')} style={{width:Math.max(3,(s.n/maxCount)*100)+'%'}}/></div></div>):<Empty icon={Activity} title="لا توجد مشاريع بعد" text="ستظهر هنا نسب التقدم بعد إدخال المشاريع"/>}</div></section>
   <section className="panel"><SectionTitle icon={MapPin} title="التوزيع الجغرافي" subtitle="المشاريع حسب المحافظات"/>{stats.byGovernorate?.length?<div className="governorate-list">{stats.byGovernorate.map((g,i)=><div className="governorate-item" key={g.governorate}><div className="number">{String(i+1).padStart(2,'0')}</div><div><b>{g.governorate}</b><span>{cash(g.amount)}</span></div><strong>{g.n} مشروع</strong></div>)}</div>:<Empty icon={MapPin} text="لا توجد بيانات جغرافية مسجلة"/>}</section></div>
  <section className="panel table-panel"><SectionTitle icon={FolderKanban} title="آخر تحديثات المشاريع" subtitle="ملفات جرى العمل عليها مؤخراً"><button className="link-button" onClick={()=>navigate('projects')}>عرض جميع المشاريع <ChevronLeft size={16}/></button></SectionTitle><ProjectTable projects={stats.recent||[]} meta={meta} openProject={openProject}/></section>
 </>;
}
function ProjectTable({projects,meta,openProject}){
 if(!projects.length)return <Empty title="لا توجد مشاريع مطابقة" text="يمكنك إنشاء مشروع جديد أو تعديل عوامل البحث"/>;
 return <div className="table-scroll"><table className="data-table"><thead><tr><th>المشروع</th><th>المحافظة / القضاء</th><th>الكلفة التخمينية</th><th>المرحلة الحالية</th><th>آخر تحديث</th><th></th></tr></thead><tbody>{projects.map(p=><tr key={p.id} onClick={()=>openProject(p.id)} className="click-row"><td><strong>{p.title}</strong><span className="table-ref">{p.code}</span></td><td>{p.governorate}<span className="table-ref">{p.district}</span></td><td className="latin">{cash(p.estimated_cost)}</td><td><Badge tone={stageTone[p.status]}>{stageName(meta,p.status)}</Badge></td><td>{formatDate(p.updated_at)}</td><td><ChevronLeft size={18} className="muted-icon"/></td></tr>)}</tbody></table></div>;
}
function Projects({projects,meta,openProject,create,user}){
 const [q,setQ]=useState(''),[status,setStatus]=useState('');
 const filtered=useMemo(()=>projects.filter(p=>(!q||(p.title+' '+p.code+' '+p.governorate).toLowerCase().includes(q.toLowerCase()))&&(!status||p.status===status)),[q,status,projects]);
 return <><div className="page-intro"><div><div className="eyebrow">PROJECT REGISTRY</div><h1>سجل المشاريع</h1><p>جميع المشاريع المدرجة وتصنيفها بحسب الموقع والمرحلة والكلفة.</p></div>{['admin','submitter'].includes(user.role)&&<Button icon={Plus} onClick={create}>مشروع جديد</Button>}</div>
 <div className="panel table-panel"><div className="toolbar"><div className="search-wrap"><Search size={19}/><input placeholder="ابحث باسم المشروع أو الرقم أو المحافظة..." value={q} onChange={e=>setQ(e.target.value)}/></div><div className="select-wrap"><Filter size={17}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">جميع المراحل</option>{meta.stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><span className="records-count">{filtered.length} مشروع</span></div><ProjectTable projects={filtered} meta={meta} openProject={openProject}/></div></>;
}
function WorkQueue({kind,projects,meta,openProject,stats}){
 const maps={reviews:{title:'الموافقات واللجان',sub:'الملفات التي تتطلب مراجعات ومصادقات وقرارات لجان.',statuses:['engineering_review','committee_review','planning_approval','award_approval'],icon:ClipboardCheck},
 tenders:{title:'الإعلانات والعطاءات',sub:'ملفات الإعلان والاستلام وفتح العطاءات وتحليلها.',statuses:['announcement','tendering','bid_opening','bid_analysis'],icon:Megaphone},
 awards:{title:'الإحالة والتعاقد',sub:'قرارات الإحالة والتبليغات والعقود الموقعة.',statuses:['award_approval','awarded','contracting'],icon:Gavel},
 finance:{title:'السلف والصرف',sub:'المشاريع في مرحلة المباشرة والسلف المالية المرتبطة بها.',statuses:['execution','completed'],icon:Wallet}};
 const cfg=maps[kind],list=projects.filter(p=>cfg.statuses.includes(p.status));
 return <><div className="page-intro"><div><div className="eyebrow">WORKSPACE / {kind.toUpperCase()}</div><h1>{cfg.title}</h1><p>{cfg.sub}</p></div></div><div className="queue-summary"><div className="queue-icon"><cfg.icon size={24}/></div><div><b>{list.length} ملفات قيد النطاق</b><span>اختر ملفاً لعرض الصلاحيات والوثائق والإجراءات المتاحة.</span></div></div><div className="panel table-panel"><ProjectTable projects={list} meta={meta} openProject={openProject}/></div></>;
}
function Progress({p,meta}){
 const sequence=meta.stages.filter(s=>!['rejected','completed'].includes(s.id));
 const at=sequence.findIndex(s=>s.id===p.status);
 return <div className="progress-scroller"><div className="progress-track">{sequence.map((s,i)=><div key={s.id} className={'progress-node '+(at===i?'current ':'')+(at>i||p.status==='completed'?'done':'')}><div className="progress-bubble">{at>i||p.status==='completed'?<CheckCircle2 size={16}/>:<span>{i+1}</span>}</div><div>{s.name}</div></div>)}</div></div>;
}
function ProjectDetail({p,meta,user,committees,notify,reload,goBack,onEdit}){
 const [tab,setTab]=useState('overview'),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setTab('overview');setNote('');},[p?.id]);
 if(!p)return <Loading/>;
 const docsFound=new Set(p.documents.map(d=>d.doc_key)),waived=new Set(p.waivers.map(w=>w.doc_key));
 const mainTabs=[{id:'overview',name:'نظرة عامة',icon:LayoutDashboard},{id:'docs',name:'المستندات',icon:FileText},{id:'committee',name:'اللجان',icon:UsersRound},{id:'procurement',name:'التعاقدات والعطاءات',icon:Gavel},{id:'advances',name:'السلف',icon:Wallet},{id:'history',name:'سجل الأحداث',icon:Activity}];
 const stage=meta.stages.find(s=>s.id===p.status);
 async function action(kind){
  setBusy(true);
  try{await api('/projects/'+p.id+'/actions',{method:'POST',body:JSON.stringify({action:kind,note})});notify('تم حفظ القرار وتحديث مسار المشروع');setNote('');reload();}
  catch(e){notify(e.message,'error');}finally{setBusy(false);}
 }
 const mayAction=stage?.role===user.role || (p.status==='draft'&&user.role==='admin');
 const missing=stage?.required.filter(k=>!docsFound.has(k)&&!waived.has(k))||[];
 const completion=Math.round(meta.docs.filter(d=>docsFound.has(d.key)||waived.has(d.key)).length/meta.docs.length*100);
 return <>
  <div className="detail-crumb"><button onClick={goBack}>سجل المشاريع</button><ChevronLeft size={15}/> {p.code}</div>
  <div className="project-heading"><div><div className="project-code"><Hash size={14}/> {p.code} <Badge tone={stageTone[p.status]}>{stageName(meta,p.status)}</Badge></div><h1>{p.title}</h1><div className="project-attrs"><span><MapPin size={15}/> {p.governorate} / {p.district}</span><span><Building2 size={15}/> {p.beneficiary}</span><span><CalendarDays size={15}/> سنة {p.fiscal_year}</span></div></div><div className="heading-actions">{p.status==='draft'&&(user.role==='admin'||user.id===p.created_by)&&<Button variant="outline" icon={Settings2} onClick={onEdit}>تعديل البيانات</Button>}<Button variant="outline" icon={Printer} onClick={()=>window.print()}>طباعة</Button></div></div>
  <div className="panel progress-panel"><div className="minor-heading"><span>تسلسل دورة المشروع</span><span className="muted">يخضع كل انتقال للتحقق من الصلاحيات والمستندات</span></div><Progress p={p} meta={meta}/></div>
  <div className="tabs">{mainTabs.map(t=><button className={tab===t.id?'active':''} onClick={()=>setTab(t.id)} key={t.id}><t.icon size={17}/>{t.name}{t.id==='docs'&&<i>{p.documents.length}</i>}</button>)}</div>
  {tab==='overview'&&<div className="detail-grid"><div className="stack">
   <section className="panel"><SectionTitle icon={ListChecks} title="بيانات المشروع" subtitle="البيانات المعتمدة في ملف الإدراج"/><div className="info-grid">{[['الرمز',p.code],['الجهة المستفيدة',p.beneficiary],['الجهة المنفذة',p.executing_entity||'غير محددة'],['القطاع',p.sector],['المحافظة',p.governorate],['القضاء',p.district],['أسلوب التعاقد',p.procurement_method],['السنة المالية',p.fiscal_year]].map(([a,b])=><div className="info-pair" key={a}><span>{a}</span><strong>{b}</strong></div>)}</div>{p.summary&&<div className="project-description"><span>نبذة المشروع</span><p>{p.summary}</p></div>}</section>
   <section className="panel"><SectionTitle icon={Banknote} title="التقديرات المالية"/><div className="money-grid"><div><span>الكلفة التخمينية</span><strong>{cash(p.estimated_cost)}</strong></div><div><span>الكلفة الكلية</span><strong>{cash(p.total_cost)}</strong></div>{p.contract&&<div><span>القيمة التعاقدية</span><strong>{cash(p.contract.contract_amount)}</strong></div>}</div></section>
   <section className="panel"><SectionTitle icon={Activity} title="آخر الحركات"/>{p.audits.length?<div className="timeline compact">{p.audits.slice(0,5).map(a=><div className="timeline-item" key={a.id}><div className="timeline-dot"/><div><strong>{eventName(a.action)}</strong><span>{a.actor_name} · {dateTime(a.created_at)}</span>{a.details&&<p>{a.details}</p>}</div></div>)}</div>:<Empty text="لا توجد أحداث"/>}</section>
  </div><div className="stack">
   <section className="panel action-panel"><SectionTitle icon={BadgeCheck} title="الإجراء الحالي" subtitle="تظهر إجراءات المرحلة لمن يملك الصلاحية"/><Badge tone={stageTone[p.status]}>{stageName(meta,p.status)}</Badge><p className="action-description">المرحلة الحالية: {stage?.name}. {mayAction?'حسابك مخوّل لتسجيل القرار بحسب دورك.':'يمكنك الاطلاع على الملف دون تغيير حالته.'}</p>{missing.length>0&&<div className="missing-alert"><AlertTriangle size={18}/><div><b>مستندات تمنع الانتقال</b>{missing.map(k=><span key={k}>{meta.docs.find(d=>d.key===k)?.label}</span>)}</div></div>}
    {mayAction&&stage?.next&&<><Label title="ملاحظات القرار / مرجع المحضر"><textarea rows="3" placeholder="دوّن رقم الكتاب أو محضر اللجنة وأسباب القرار..." value={note} onChange={e=>setNote(e.target.value)}/></Label><div className="action-buttons"><Button onClick={()=>action('approve')} loading={busy} icon={CheckCircle2}>{stage.action}</Button>{p.status!=='draft'&&<><Button variant="outline" icon={RotateCcw} onClick={()=>action('return')} disabled={busy||note.trim().length<8}>إرجاع خطوة</Button><Button variant="danger" icon={Ban} onClick={()=>action('reject')} disabled={busy||note.trim().length<8}>رفض</Button></>}</div></>}
    {!mayAction&&<div className="quiet-help"><ShieldCheck size={17}/> القرار محصور بالدور: {stage?.role?roleName(meta,stage.role):'لا يوجد إجراء'}</div>}
   </section>
   <section className="panel"><SectionTitle icon={FileCheck2} title="جاهزية المستندات" subtitle="متطلبات الإدراج والملف التعاقدي"><button className="link-button" onClick={()=>setTab('docs')}>فتح القائمة <ChevronLeft size={15}/></button></SectionTitle><div className="readiness"><div className="readiness-num">{completion}%</div><div className="readiness-track"><span style={{width:completion+'%'}}/></div><p>{docsFound.size} نوع مستند مسجل، {waived.size} مستندات غير منطبقة.</p></div><div className="doc-preview">{meta.docs.slice(0,6).map(d=><div key={d.key}><span>{docsFound.has(d.key)?<CheckCircle2 size={17} className="good"/>:waived.has(d.key)?<Circle size={17}/>:<Circle size={17} className="faint"/>}</span>{d.label}</div>)}</div></section>
  </div></div>}
  {tab==='docs'&&<Documents p={p} meta={meta} user={user} notify={notify} reload={reload}/>}
  {tab==='committee'&&<CommitteePanel p={p} user={user} committees={committees} meta={meta} notify={notify} reload={reload}/>}
  {tab==='procurement'&&<Procurement p={p} user={user} meta={meta} notify={notify} reload={reload}/>}
  {tab==='advances'&&<Advances p={p} user={user} notify={notify} reload={reload}/>}
  {tab==='history'&&<section className="panel"><SectionTitle icon={Activity} title="سجل الأحداث والقرارات" subtitle="تعاقب الإجراءات المؤرخة باسم المنفذ"/>{p.audits.length?<div className="timeline">{p.audits.map(a=><div className="timeline-item" key={a.id}><div className="timeline-dot"/><div><strong>{eventName(a.action)}</strong><span>{a.actor_name} · {dateTime(a.created_at)}</span>{a.from_status!==a.to_status&&a.to_status&&<Badge tone={stageTone[a.to_status]}>{stageName(meta,a.to_status)}</Badge>}{a.details&&<p>{a.details}</p>}</div></div>)}</div>:<Empty/>}</section>}
 </>;
}
const eventName=key=>({
 'project.created':'إنشاء مسودة المشروع','project.updated':'تحديث البيانات الأساسية','project.committee_assigned':'تعيين لجنة الإدراج',
 'stage.approved':'مصادقة وانتقال مرحلة','stage.return':'إعادة الملف للمراجعة','stage.reject':'رفض الملف',
 'document.uploaded':'رفع مستند','document.not_applicable':'تسجيل عدم الانطباق',
 'committee.vote.approve':'تصويت بالموافقة','committee.vote.reject':'تصويت بالرفض',
 'tender.saved':'تسجيل إعلان المناقصة','bid.received':'استلام عطاء','bid.recommended':'تحديد توصية الإحالة',
 'contract.saved':'تسجيل بيانات العقد','advance.requested':'طلب سلفة'
})[key]||key.replace('advance.','إجراء السلفة: ');
function Documents({p,meta,user,notify,reload}){
 const [key,setKey]=useState('study'),[busy,setBusy]=useState(''),[waive,setWaive]=useState(null),[waiveReason,setWaiveReason]=useState('');
 const groups=[{name:'متطلبات الإدراج الواردة في القائمة المرفقة',keys:['study','ownership','boq','committee_orders','conflicts','water_share','land_clearance','drawings','aerial','environment_report','environment_approval','soil','governorate_priorities']},{name:'مستندات التعاقد والتنفيذ',keys:['planning_letter','tender_announcement','opening_minutes','analysis_report','award_approval','award_notice','objections_cleared','signed_contract','site_handover','advance_certificate','final_acceptance']}];
 const found=new Set(p.documents.map(d=>d.doc_key)),waived=new Set(p.waivers.map(x=>x.doc_key));
 async function sendFile(e,k){
  const file=e.target.files?.[0];if(!file)return;
  const data=new FormData();data.append('doc_key',k);data.append('file',file);
  setBusy(k);try{await api('/projects/'+p.id+'/documents',{method:'POST',body:data});notify('تم أرشفة المستند بنجاح');reload();}catch(e){notify(e.message,'error');}finally{setBusy('');e.target.value='';}
 }
 async function download(doc){
  try{const blob=await api('/documents/'+doc.id+'/download',{blob:true});const u=URL.createObjectURL(blob);const link=document.createElement('a');link.href=u;link.download=doc.original_name;link.click();URL.revokeObjectURL(u);}catch(e){notify(e.message,'error');}
 }
 async function waiveDoc(){
  if(!waiveReason.trim())return;
  try{await api('/projects/'+p.id+'/waivers',{method:'POST',body:JSON.stringify({doc_key:waive,reason:waiveReason})});notify('تم توثيق عدم الانطباق');setWaive(null);setWaiveReason('');reload();}catch(e){notify(e.message,'error');}
 }
 return <div className="stack"><div className="info-line"><ShieldCheck size={18}/> تتضمن القائمة متطلبات الورقة المرفقة مع وثائق تضاف خلال التعاقد. لا يعني رفع المستند صحة مضمونه أو اعتماده القانوني.</div>
 {groups.map(g=><section className="panel" key={g.name}><SectionTitle icon={FileText} title={g.name} subtitle="يمكن إرفاق أكثر من إصدار؛ يحتفظ النظام بالإصدارات السابقة"/><div className="document-list">{g.keys.map((key,i)=>{const d=meta.docs.find(d=>d.key===key);if(!d)return null;const items=p.documents.filter(x=>x.doc_key===key);return <div className="document-row" key={key}><div className="document-state">{found.has(key)?<CheckCircle2 size={20} className="good"/>:waived.has(key)?<CircleHelp size={20} className="muted-icon"/>:<Circle size={20} className="faint"/>}</div><div className="document-info"><b>{d.label}</b><div><span>{d.required?'إلزامي في مرحلة محددة':'بحسب انطباقه على نوع المشروع'}</span>{items.length>0&&<Badge tone="mint">{items.length} ملف</Badge>}{waived.has(key)&&<Badge tone="muted">غير منطبق</Badge>}</div>{items.map(x=><button className="file-link" onClick={()=>download(x)} key={x.id}><Download size={13}/>{x.original_name}<span>· {formatDate(x.created_at)}</span></button>)}</div><div className="document-actions">{!['completed','rejected'].includes(p.status)&&<label className="btn btn-outline small pointer"><UploadCloud size={15}/>{busy===key?'جارٍ الرفع...':'رفع ملف'}<input type="file" hidden disabled={!!busy} accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" onChange={e=>sendFile(e,key)}/></label>}{!d.required&&['admin','engineer'].includes(user.role)&&!waived.has(key)&&<button className="tiny-link" onClick={()=>setWaive(key)}>غير منطبق</button>}</div></div>;})}</div></section>)}
 {waive&&<Modal title="توثيق عدم الانطباق" close={()=>setWaive(null)}><p>سيحفظ القرار في سجل التدقيق؛ لا يمكن الإعفاء من الوثائق الإلزامية.</p><Label title="سبب عدم انطباق المستند"><textarea value={waiveReason} onChange={e=>setWaiveReason(e.target.value)} rows="3" required/></Label><div className="form-actions"><Button variant="ghost" onClick={()=>setWaive(null)}>إلغاء</Button><Button onClick={waiveDoc}>حفظ السبب</Button></div></Modal>}
 </div>;
}
function CommitteePanel({p,user,committees,meta,notify,reload}){
 const [selected,setSelected]=useState(p.committee_id||''),[decision,setDecision]=useState('approve'),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const committee=committees.find(c=>c.id===p.committee_id);
 const votes=p.reviews.filter(v=>v.review_round===p.review_round);
 const isMember=committee?.members.some(m=>m.id===user.id);
 const canVote=['committee_member','committee_chair'].includes(user.role)&&isMember&&p.status==='committee_review'&&!votes.some(v=>v.user_id===user.id);
 async function assign(){try{await api('/projects/'+p.id+'/committee',{method:'POST',body:JSON.stringify({committee_id:selected})});notify('تم تعيين اللجنة');reload();}catch(e){notify(e.message,'error');}}
 async function vote(){setBusy(true);try{await api('/projects/'+p.id+'/votes',{method:'POST',body:JSON.stringify({decision,note})});notify('تم تسجيل صوتك في محضر اللجنة');setNote('');reload();}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
 return <div className="detail-grid"><div className="stack"><section className="panel"><SectionTitle icon={UsersRound} title="لجنة تدقيق الإدراج" subtitle="عضويات محددة وتصويت فردي محفوظ بالاسم"/>{committee?<><div className="committee-card"><div><strong>{committee.name}</strong><span>نصاب الموافقة المطلوب: {committee.quorum} أصوات</span></div><Badge tone="violet">{committee.members.length} أعضاء</Badge></div><div className="members-list">{committee.members.map(m=><div key={m.id}><div className="user-avatar small">{m.name?.[0]}</div><span>{m.name}<small>{roleName(meta,m.role)}</small></span></div>)}</div></>:<Empty icon={UsersRound} title="لم تُحدد لجنة" text="عيّن لجنة من قائمة اللجان قبل إحالة المشروع إليها"/>}</section>
 <section className="panel"><SectionTitle icon={ClipboardCheck} title="محضر التصويت" subtitle={'دورة المراجعة رقم '+p.review_round}/>{votes.length?<div className="votes-list">{votes.map(v=><div key={v.id}><div><b>{v.reviewer_name}</b><small>{dateTime(v.created_at)}</small></div><Badge tone={v.decision==='approve'?'green':'red'}>{v.decision==='approve'?'موافق':'غير موافق'}</Badge><p>{v.note}</p></div>)}</div>:<Empty title="لم يصدر تصويت" text="تُحفظ أصوات الأعضاء ويعتمد رئيس اللجنة المحضر بعد اكتمال النصاب"/>}</section></div>
 <div className="stack">{['admin','engineer'].includes(user.role)&&['draft','engineering_review'].includes(p.status)&&<section className="panel"><SectionTitle icon={Settings2} title="تعيين لجنة المشروع"/><Label title="اللجنة"><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">اختر لجنة</option>{committees.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Label><Button icon={CheckCircle2} disabled={!selected} onClick={assign}>تعيين اللجنة</Button></section>}
 {canVote&&<section className="panel"><SectionTitle icon={BadgeCheck} title="إصدار رأي العضو" subtitle="صوت واحد لكل عضو في دورة المراجعة"/><Label title="التوصية"><select value={decision} onChange={e=>setDecision(e.target.value)}><option value="approve">موافقة</option><option value="reject">عدم الموافقة</option></select></Label><Label title="تعليل الرأي"><textarea rows="4" value={note} onChange={e=>setNote(e.target.value)} placeholder="الملاحظات الفنية والإدارية ومرجع القرار"/></Label><Button icon={Send} loading={busy} onClick={vote} disabled={!note.trim()}>تثبيت التصويت</Button></section>}
 <div className="info-line"><ShieldCheck size={18}/> لجنة الإدراج تختلف عن لجان فتح العطاءات وتحليلها والمصادقة على الإحالة. النصاب والترشيحات تعتمد محلياً من إدارة الصندوق.</div></div></div>;
}
function Procurement({p,user,meta,notify,reload}){
 const [t,setT]=useState(p.tender||{tender_no:'',published_at:'',closes_at:'',publication_url:'',notes:''});
 const [b,setB]=useState({bidder:'',offer_amount:'',received_at:'',compliant:true,note:''});
 const [c,setC]=useState(p.contract||{contract_no:'',contractor:'',contract_amount:'',signed_at:'',duration_days:'',approval_ref:'',notes:''});
 const [busy,setBusy]=useState(false);
 const set=(fn,key,value)=>fn(v=>({...v,[key]:value}));
 async function save(endpoint,data){
  setBusy(true);try{await api('/projects/'+p.id+endpoint,{method:'POST',body:JSON.stringify(endpoint==='/tender'?{...data,published_at:data.published_at?data.published_at+':00+03:00':'',closes_at:data.closes_at?data.closes_at+':00+03:00':''}:endpoint==='/bids'?{...data,received_at:data.received_at?data.received_at+':00+03:00':''}:data)});notify('تم حفظ السجل التعاقدي');reload();}catch(e){notify(e.message,'error');}finally{setBusy(false);}
 }
 async function recommend(id){await save('/bids/'+id+'/recommend',{});}
 return <div className="stack">
 <section className="panel"><SectionTitle icon={Megaphone} title="الإعلان عن المناقصة" subtitle="توثيق رقم الإعلان ومواعيد النشر والإغلاق"/>{p.tender&&<div className="success-line"><CheckCircle2 size={17}/> مسجل: {p.tender.tender_no} · تاريخ الغلق {dateTime(p.tender.closes_at)}</div>}{user.role==='contracts'&&['announcement','tendering'].includes(p.status)?<form onSubmit={e=>{e.preventDefault();save('/tender',t);}}><div className="form-grid two"><Label title="رقم المناقصة"><input required value={t.tender_no} onChange={e=>set(setT,'tender_no',e.target.value)}/></Label><Label title="رابط الإعلان الرسمي"><input value={t.publication_url} onChange={e=>set(setT,'publication_url',e.target.value)} placeholder="https://..."/></Label><Label title="تاريخ ووقت النشر"><input required type="datetime-local" value={t.published_at?.slice(0,16)} onChange={e=>set(setT,'published_at',e.target.value)}/></Label><Label title="تاريخ ووقت الغلق"><input required type="datetime-local" value={t.closes_at?.slice(0,16)} onChange={e=>set(setT,'closes_at',e.target.value)}/></Label></div><Label title="قنوات النشر والملاحظات"><textarea rows="2" value={t.notes} onChange={e=>set(setT,'notes',e.target.value)}/></Label><Button type="submit" loading={busy} icon={CheckCircle2}>حفظ الإعلان</Button></form>:!p.tender&&<Empty title="لم يسجل إعلان" text="يتاح إدخال تفاصيل الإعلان لدور مديرية العقود في مرحلته"/>}
 <div className="info-line"><ExternalLink size={16}/> توثيق رابط الإعلان لا يقوم بنشره تلقائياً على المنصة الإلكترونية الموحدة أو الصحف المطلوبة.</div></section>
 <section className="panel"><SectionTitle icon={Scale} title="العطاءات المستلمة" subtitle="سجل العطاءات ونتائج التحليل وإحالة المرشح"/>{p.bids.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>مقدم العطاء</th><th>المبلغ</th><th>تاريخ الاستلام</th><th>الحالة</th><th></th></tr></thead><tbody>{p.bids.map(x=><tr key={x.id}><td><strong>{x.bidder}</strong><span className="table-ref">{x.note}</span></td><td>{cash(x.offer_amount)}</td><td>{dateTime(x.received_at)}</td><td><Badge tone={x.recommended?'green':x.compliant?'mint':'red'}>{x.recommended?'موصى بالإحالة':x.compliant?'مستجيب':'غير مستجيب'}</Badge></td><td>{user.role==='analysis_committee'&&p.status==='bid_analysis'&&x.compliant&&!x.recommended&&<button className="tiny-link" onClick={()=>recommend(x.id)}>اختيار</button>}</td></tr>)}</tbody></table></div>:<Empty icon={Scale} title="لا توجد عطاءات" text="يمكن إضافة العطاءات أثناء الاستلام وفتح المغلفات"/>}
 {['contracts','opening_committee'].includes(user.role)&&['tendering','bid_opening'].includes(p.status)&&<form className="spaced-form" onSubmit={e=>{e.preventDefault();save('/bids',b);}}><div className="form-grid two"><Label title="الشركة / مقدم العطاء"><input required value={b.bidder} onChange={e=>set(setB,'bidder',e.target.value)}/></Label><Label title="قيمة العرض بالدينار"><input type="number" min="1" required value={b.offer_amount} onChange={e=>set(setB,'offer_amount',e.target.value)}/></Label><Label title="وقت استلام العطاء"><input required type="datetime-local" value={b.received_at} onChange={e=>set(setB,'received_at',e.target.value)}/></Label><Label title="التقييم الأولي"><select value={String(b.compliant)} onChange={e=>set(setB,'compliant',e.target.value==='true')}><option value="true">مستجيب أولياً</option><option value="false">غير مستجيب</option></select></Label></div><Button type="submit" loading={busy} icon={Plus}>إضافة عطاء</Button></form>}</section>
 <section className="panel"><SectionTitle icon={FileCheck2} title="الإحالة والعقد" subtitle="لا يعد العقد نافذاً لمجرد حفظه في المنظومة"/>{p.contract&&<div className="contract-summary"><div><span>رقم العقد</span><strong>{p.contract.contract_no}</strong></div><div><span>المتعاقد</span><strong>{p.contract.contractor}</strong></div><div><span>قيمة العقد</span><strong>{cash(p.contract.contract_amount)}</strong></div><div><span>مدة التنفيذ</span><strong>{p.contract.duration_days} يوماً</strong></div><div><span>مرجع المصادقة</span><strong>{p.contract.approval_ref}</strong></div></div>}
 {['legal','contracts'].includes(user.role)&&['awarded','contracting'].includes(p.status)&&<form className="spaced-form" onSubmit={e=>{e.preventDefault();save('/contract',c);}}><div className="form-grid two"><Label title="رقم العقد"><input required value={c.contract_no} onChange={e=>set(setC,'contract_no',e.target.value)}/></Label><Label title="اسم المقاول"><input required value={c.contractor} onChange={e=>set(setC,'contractor',e.target.value)}/></Label><Label title="قيمة العقد بالدينار"><input required type="number" min="1" value={c.contract_amount} onChange={e=>set(setC,'contract_amount',e.target.value)}/></Label><Label title="تاريخ التوقيع"><input required type="date" value={c.signed_at?.slice(0,10)} onChange={e=>set(setC,'signed_at',e.target.value)}/></Label><Label title="المدة التعاقدية بالأيام"><input required type="number" min="1" value={c.duration_days} onChange={e=>set(setC,'duration_days',e.target.value)}/></Label><Label title="مرجع المصادقة القانونية"><input required value={c.approval_ref} onChange={e=>set(setC,'approval_ref',e.target.value)}/></Label></div><Button loading={busy} type="submit" icon={CheckCircle2}>حفظ بيانات العقد</Button></form>}
 </section></div>;
}
function Advances({p,user,notify,reload}){
 const [v,setV]=useState({type:'مستخلص أعمال',reference:'',amount:'',note:''}),[busy,setBusy]=useState(false),[reason,setReason]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);try{await api('/projects/'+p.id+'/advances',{method:'POST',body:JSON.stringify(v)});notify('تم تسجيل طلب السلفة');setV({type:'مستخلص أعمال',reference:'',amount:'',note:''});reload();}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
 async function action(id,what){setBusy(true);try{await api('/advances/'+id+'/action',{method:'POST',body:JSON.stringify({action:what,note:reason})});notify('تم تحديث الطلب');setReason('');reload();}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
 const total=p.advances.filter(a=>a.status==='paid').reduce((s,a)=>s+a.paid_amount,0);
 const next={requested:{role:'supervisor',action:'verify_technical',text:'اعتماد فني'},technical_verified:{role:'finance',action:'verify_financial',text:'تدقيق مالي'},financial_verified:{role:'chairman',action:'authorize',text:'تخويل الصرف'},authorized:{role:'finance',action:'pay',text:'إثبات الصرف'}};
 return <div className="stack"><div className="money-grid finance-totals"><div><span>القيمة التعاقدية</span><strong>{cash(p.contract?.contract_amount)}</strong></div><div><span>السلف المصروفة المسجلة</span><strong>{cash(total)}</strong></div><div><span>طلبات قيد المعالجة</span><strong>{p.advances.filter(a=>!['paid','rejected'].includes(a.status)).length}</strong></div></div>
 <section className="panel"><SectionTitle icon={Wallet} title="طلبات السلف والصرف" subtitle="الطلب → التدقيق الفني → المالي → التخويل → إثبات الصرف"/>{p.advances.length?<div className="advances-list">{p.advances.map(a=><div className="advance-card" key={a.id}><div className="advance-card-head"><div><strong>{a.reference}</strong><small>{a.type} · {a.requested_by} · {dateTime(a.created_at)}</small></div><Badge tone={a.status==='paid'?'green':a.status==='rejected'?'red':'amber'}>{advanceNames[a.status]}</Badge></div><div className="advance-amount">{cash(a.amount)}</div>{a.note&&<p>{a.note}</p>}{next[a.status]?.role===user.role&&<div className="advance-action"><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="ملاحظة أو مرجع قرار (اختياري)"/><Button loading={busy} icon={CheckCircle2} onClick={()=>action(a.id,next[a.status].action)}>{next[a.status].text}</Button><Button variant="danger" disabled={reason.trim().length<8||busy} onClick={()=>action(a.id,'reject')}>رفض</Button></div>}</div>)}</div>:<Empty icon={Wallet} title="لم تسجّل سلف" text="تظهر طلبات الصرف بعد مباشرة المشروع"/>}</section>
 {user.role==='supervisor'&&p.status==='execution'&&<section className="panel"><SectionTitle icon={Plus} title="طلب سلفة جديدة" subtitle="تحديد المستخلص والرقم المرجعي والمبلغ المطلوب"/><form onSubmit={submit}><div className="form-grid three"><Label title="نوع السلفة"><select value={v.type} onChange={e=>setV(s=>({...s,type:e.target.value}))}><option>مستخلص أعمال</option><option>سلفة مقدمة</option><option>سلفة نهائية</option></select></Label><Label title="الرقم المرجعي"><input required value={v.reference} onChange={e=>setV(s=>({...s,reference:e.target.value}))}/></Label><Label title="المبلغ بالدينار"><input required type="number" min="1" value={v.amount} onChange={e=>setV(s=>({...s,amount:e.target.value}))}/></Label></div><Label title="ملاحظات فنية"><textarea rows="2" value={v.note} onChange={e=>setV(s=>({...s,note:e.target.value}))}/></Label><div className="info-line">يجب رفع مستندات المستخلص في تبويب المستندات قبل التدقيق. الصرف الموثق هنا ليس حوالة مصرفية فعلية.</div><Button type="submit" icon={Send} loading={busy}>رفع طلب السلفة</Button></form></section>}
 </div>;
}
function UserManagement({users,committees,meta,notify,reload}){
 const [tab,setTab]=useState('users'),[u,setU]=useState({username:'',name:'',role:'submitter',password:''}),[c,setC]=useState({name:'',quorum:2}),[link,setLink]=useState({committee_id:'',user_id:''}),[busy,setBusy]=useState(false);
 async function send(url,data,done){setBusy(true);try{await api(url,{method:'POST',body:JSON.stringify(data)});notify('تم الحفظ');done?.();reload();}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
 return <><div className="page-intro"><div><div className="eyebrow">ACCESS MANAGEMENT</div><h1>المستخدمون واللجان</h1><p>توزيع صلاحيات الموظفين وتشكيل لجان الإدراج ومسؤولياتها.</p></div></div>
 <div className="tabs"><button className={tab==='users'?'active':''} onClick={()=>setTab('users')}><UsersRound size={17}/> المستخدمون ({users.length})</button><button className={tab==='committees'?'active':''} onClick={()=>setTab('committees')}><ClipboardCheck size={17}/> لجان الإدراج ({committees.length})</button></div>
 {tab==='users'?<div className="detail-grid"><section className="panel"><SectionTitle icon={UsersRound} title="دليل المستخدمين" subtitle="حساب منفصل لكل موظف، ودور أساسي واحد"/><div className="members-list">{users.map(x=><div key={x.id}><div className="user-avatar small">{x.name?.[0]}</div><span>{x.name}<small>@{x.username} · {roleName(meta,x.role)}</small></span><Badge tone={x.active?'green':'red'}>{x.active?'نشط':'معطل'}</Badge></div>)}</div></section><section className="panel"><SectionTitle icon={Plus} title="إنشاء حساب وظيفي"/><form onSubmit={e=>{e.preventDefault();send('/users',u,()=>setU({username:'',name:'',role:'submitter',password:''}));}}><Label title="اسم المستخدم اللاتيني"><input required value={u.username} onChange={e=>setU(s=>({...s,username:e.target.value}))}/></Label><Label title="الاسم الوظيفي"><input required value={u.name} onChange={e=>setU(s=>({...s,name:e.target.value}))}/></Label><Label title="الصلاحية"><select value={u.role} onChange={e=>setU(s=>({...s,role:e.target.value}))}>{Object.entries(meta.roles).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></Label><Label title="كلمة مرور أولية (12 رمزاً على الأقل)"><input required type="password" minLength="12" value={u.password} onChange={e=>setU(s=>({...s,password:e.target.value}))}/></Label><Button type="submit" icon={Plus} loading={busy}>إنشاء الحساب</Button></form></section></div>:
 <div className="detail-grid"><section className="panel"><SectionTitle icon={ClipboardCheck} title="اللجان المشكلة"/>{committees.length?<div className="committees-list">{committees.map(c=><div key={c.id}><b>{c.name}</b><span>النصاب: {c.quorum} · {c.members.length} أعضاء</span><div>{c.members.map(m=><Badge key={m.id} tone="muted">{m.name}</Badge>)}</div></div>)}</div>:<Empty title="لا توجد لجان"/>}</section>
 <div className="stack"><section className="panel"><SectionTitle icon={Plus} title="إنشاء لجنة"/><form onSubmit={e=>{e.preventDefault();send('/committees',c,()=>setC({name:'',quorum:2}));}}><Label title="اسم اللجنة"><input required value={c.name} onChange={e=>setC(s=>({...s,name:e.target.value}))}/></Label><Label title="نصاب الموافقة المحدد بقرار التشكيل"><input min="1" max="20" type="number" value={c.quorum} onChange={e=>setC(s=>({...s,quorum:e.target.value}))}/></Label><Button type="submit" loading={busy}>إنشاء لجنة</Button></form></section><section className="panel"><SectionTitle icon={UsersRound} title="إضافة عضو إلى لجنة"/><form onSubmit={e=>{e.preventDefault();send('/committees/'+link.committee_id+'/members',{user_id:link.user_id},()=>setLink({committee_id:'',user_id:''}));}}><Label title="اللجنة"><select required value={link.committee_id} onChange={e=>setLink(s=>({...s,committee_id:e.target.value}))}><option value="">اختر اللجنة</option>{committees.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Label><Label title="عضو اللجنة"><select required value={link.user_id} onChange={e=>setLink(s=>({...s,user_id:e.target.value}))}><option value="">اختر الموظف</option>{users.filter(u=>['committee_member','committee_chair'].includes(u.role)).map(u=><option key={u.id} value={u.id}>{u.name} · {roleName(meta,u.role)}</option>)}</select></Label><Button type="submit" loading={busy}>إضافة العضو</Button></form></section></div></div>}
 <div className="info-line"><AlertTriangle size={18}/> يجب إصدار أوامر التشكيل وتوثيق الصلاحيات الرسمية خارج المنظومة ثم إرفاقها. تم فصل أدوار لجان الفتح والتحليل والمصادقة.</div>
 </>;
}
function AuditPage({audits,meta,openProject}){
 return <><div className="page-intro"><div><div className="eyebrow">AUDIT TRAIL</div><h1>سجل التدقيق</h1><p>آخر الأحداث مع اسم المنفذ ومرجع المشروع وتاريخ الإجراء.</p></div></div><section className="panel table-panel">{audits.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>الإجراء</th><th>المنفذ</th><th>المشروع</th><th>التاريخ</th><th>التفاصيل</th></tr></thead><tbody>{audits.map(a=><tr key={a.id}><td><strong>{eventName(a.action)}</strong></td><td>{a.actor_name}</td><td>{a.project_code||'—'}</td><td>{dateTime(a.created_at)}</td><td>{a.details?.slice(0,160)}</td></tr>)}</tbody></table></div>:<Empty/>}</section></>;
}
function Regulations({meta}){
 const links=[
 {title:'تعليمات تنفيذ العقود العامة رقم (1) لسنة 2025',description:'التعليمات السارية لإجراءات التعاقد، لجان الفتح والتحليل والمصادقة، الاعتراضات والعقود.',url:'https://iraqld.msla.iq/legislations/showlegislation?lawbookid=54139'},
 {title:'كتاب وزارة التخطيط بشأن بدء التطبيق',description:'توضيح تطبيق التعليمات وضوابطها الملحقة من 15 شباط 2026.',url:'https://mop.gov.iq/documents/gov_contarct/announcements/2026/3429.pdf'},
 {title:'نظام صندوق الإعمار رقم (5) لسنة 2023',description:'الإطار المؤسسي للصندوق وأهدافه ومجلس إدارته.',url:'https://iraqld.msla.iq/legislations/showlegislation?asc=210420236626690'},
 {title:'التعديل الأول لنظام صندوق الإعمار لسنة 2024',description:'تحديد المديريات والصلاحيات وتحديث هيكل الصندوق.',url:'https://iraqld.msla.iq/legislations/showlegislation?lawbookid=51487'},
 {title:'وزارة التخطيط: متطلبات إدراج المشاريع',description:'دراسة الجدوى وجداول الكميات والمخططات وتوافر الموقع والتعارضات.',url:'https://mop.gov.iq/archives/18537'},
 {title:'دائرة العقود الحكومية العامة',description:'الوثائق القياسية والتعاميم والتحديثات والتعليمات الرسمية.',url:'https://mop.gov.iq/gover_contract24'}
 ];
 return <><div className="page-intro"><div><div className="eyebrow">POLICY & COMPLIANCE</div><h1>المراجع والإجراءات</h1><p>مصادر حكومية وتشريعية للاستناد إليها عند إعداد معايير العمل الداخلية.</p></div></div><div className="policy-warning"><AlertTriangle size={23}/><div><strong>ملاحظة تنظيمية</strong><p>هذا النظام يدعم إجراءات التوثيق والمتابعة، ولا يمنح صلاحية قانونية بحد ذاته. يجب اعتماد الهيكل التنظيمي والصلاحيات، وضوابط 2025، والاستثناءات الخاصة بالصندوق، والتعامل مع المنصات الرسمية قبل استخدامه فعلياً.</p></div></div><div className="reference-grid">{links.map(l=><a key={l.url} className="reference-card" href={l.url} target="_blank" rel="noreferrer"><div className="ref-icon"><FileText size={20}/></div><div><b>{l.title}</b><p>{l.description}</p></div><ExternalLink size={18}/></a>)}</div><section className="panel"><SectionTitle icon={ListChecks} title="مصفوفة مراحل النظام"/><div className="stages-catalog">{meta.stages.filter(s=>s.next).map((s,i)=><div key={s.id}><span>{String(i+1).padStart(2,'0')}</span><b>{s.name}</b><small>{roleName(meta,s.role)}</small><Badge tone={stageTone[s.id]}>{s.action}</Badge></div>)}</div></section></>;
}
createRoot(document.getElementById('root')).render(<App/>);
