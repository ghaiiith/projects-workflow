/**
 * Workflow is a proposed, configurable operational implementation informed by
 * Iraq Public Contracts Instructions No. 1/2025 and fund regulation No. 5/2023
 * as amended in 2024. Legal approval of local delegations remains necessary.
 */
export const roles = {
 admin:'مدير النظام', submitter:'مُقدم المشاريع', engineer:'المراجعة الهندسية',
 committee_member:'عضو لجنة الإدراج', committee_chair:'رئيس لجنة الإدراج',
 chairman:'صاحب صلاحية المصادقة', contracts:'مديرية العقود',
 opening_committee:'لجنة فتح العطاءات', analysis_committee:'لجنة تحليل العطاءات',
 award_committee:'لجنة المصادقة على الإحالة', legal:'المديرية القانونية',
 supervisor:'الإشراف الهندسي', finance:'المديرية المالية', auditor:'الرقابة والتدقيق'
};
export const stages = [
 {id:'draft',name:'إعداد المشروع',role:'submitter',next:'engineering_review',action:'تقديم للمراجعة',required:['study']},
 {id:'engineering_review',name:'التدقيق الهندسي',role:'engineer',next:'committee_review',action:'رفع إلى اللجنة',required:['boq','drawings']},
 {id:'committee_review',name:'لجنة تدقيق الإدراج',role:'committee_chair',next:'planning_approval',action:'اعتماد محضر اللجنة',required:['committee_orders']},
 {id:'planning_approval',name:'مصادقة الإدراج',role:'chairman',next:'announcement',action:'مصادقة الإدراج',required:['governorate_priorities']},
 {id:'announcement',name:'إعداد وإعلان المناقصة',role:'contracts',next:'tendering',action:'توثيق الإعلان',required:[]},
 {id:'tendering',name:'استلام العطاءات',role:'contracts',next:'bid_opening',action:'إغلاق الاستلام',required:[]},
 {id:'bid_opening',name:'لجنة فتح العطاءات',role:'opening_committee',next:'bid_analysis',action:'محضر فتح العطاءات',required:['opening_minutes']},
 {id:'bid_analysis',name:'لجنة تحليل العطاءات',role:'analysis_committee',next:'award_approval',action:'رفع توصية التحليل',required:['analysis_report']},
 {id:'award_approval',name:'المصادقة على الإحالة',role:'award_committee',next:'awarded',action:'مصادقة الإحالة',required:['award_approval']},
 {id:'awarded',name:'تبليغ الإحالة والاعتراضات',role:'contracts',next:'contracting',action:'استكمال التبليغات',required:['award_notice','objections_cleared']},
 {id:'contracting',name:'توقيع وتصديق العقد',role:'legal',next:'execution',action:'تثبيت المباشرة',required:['signed_contract','site_handover']},
 {id:'execution',name:'المباشرة والتنفيذ والسلف',role:'supervisor',next:'completed',action:'غلق المشروع',required:['final_acceptance']},
 {id:'completed',name:'مكتمل',role:null,next:null,action:'',required:[]},
 {id:'rejected',name:'مرفوض',role:null,next:null,action:'',required:[]}
];
export const docs = [
 {key:'study',label:'استمارة المشاريع الصغيرة أو دراسة الجدوى',phase:'draft',required:true},
 {key:'ownership',label:'الاستملاك وتخصيص الأرض',phase:'engineering_review',required:false},
 {key:'boq',label:'جداول الكميات المصادق عليها من اللجان',phase:'engineering_review',required:true},
 {key:'committee_orders',label:'أوامر تشكيل اللجان',phase:'committee_review',required:true},
 {key:'conflicts',label:'كتاب التعارضات الحديث',phase:'engineering_review',required:false},
 {key:'water_share',label:'تأييد الحصة المائية (عند الانطباق)',phase:'engineering_review',required:false},
 {key:'land_clearance',label:'محضر خلو الأرض من الشواغر',phase:'engineering_review',required:false},
 {key:'drawings',label:'المخططات والتصاميم الفنية',phase:'engineering_review',required:true},
 {key:'aerial',label:'صور جوية / مسارات الطرق',phase:'engineering_review',required:false},
 {key:'environment_report',label:'التقرير البيئي',phase:'engineering_review',required:false},
 {key:'environment_approval',label:'الموافقة البيئية',phase:'engineering_review',required:false},
 {key:'soil',label:'فحوصات التربة / تقرير الهدم',phase:'engineering_review',required:false},
 {key:'governorate_priorities',label:'كتاب أولويات الإدراج الصادر عن المحافظة',phase:'planning_approval',required:true},
 {key:'planning_letter',label:'كتاب موافقة الإدراج / التخصيص',phase:'planning_approval',required:false},
 {key:'tender_announcement',label:'نسخة الإعلان ووسائل النشر',phase:'announcement',required:false},
 {key:'opening_minutes',label:'محضر فتح العطاءات',phase:'bid_opening',required:true},
 {key:'analysis_report',label:'تقرير لجنة تحليل وتقييم العطاءات',phase:'bid_analysis',required:true},
 {key:'award_approval',label:'محضر مصادقة الإحالة',phase:'award_approval',required:true},
 {key:'award_notice',label:'كتاب الإحالة وإثبات التبليغات',phase:'awarded',required:true},
 {key:'objections_cleared',label:'محضر حسم الاعتراضات أو انتهاء مدتها',phase:'awarded',required:true},
 {key:'signed_contract',label:'العقد الموقع والمصادق عليه',phase:'contracting',required:true},
 {key:'site_handover',label:'محضر تسليم الموقع / أمر المباشرة',phase:'contracting',required:true},
 {key:'advance_certificate',label:'مستندات طلب السلفة والمستخلص',phase:'execution',required:false},
 {key:'final_acceptance',label:'محضر الاستلام النهائي وغلق المشروع',phase:'execution',required:true}
];
export const documentByKey = Object.fromEntries(docs.map(d=>[d.key,d]));
export const stageById = Object.fromEntries(stages.map(s=>[s.id,s]));
export const committeeSeparation = ['opening_committee','analysis_committee','award_committee'];
export function canAdvance(role,stage){return stageById[stage]?.role===role;}
export function previousStage(stage){const i=stages.findIndex(s=>s.id===stage);return i>0?stages[i-1].id:'draft';}
export function validateProject(value) {
 if(!value.title?.trim() || value.title.trim().length<8) throw new Error('اسم المشروع يجب أن يكون واضحاً ولا يقل عن 8 أحرف');
 if(!value.governorate?.trim() || !value.district?.trim()) throw new Error('المحافظة والقضاء حقول إلزامية');
 if(!(Number(value.estimated_cost)>0) || !(Number(value.total_cost)>0)) throw new Error('الكلفتان التخمينية والكلية يجب أن تكونا أكبر من صفر');
 if(!value.beneficiary?.trim()) throw new Error('يرجى تحديد الجهة المستفيدة');
}
export function missingDocs(stage,uploaded,waived=[]) {
 return (stageById[stage]?.required||[]).filter(k=>!uploaded.includes(k)&&!waived.includes(k));
}
export function canVote(role){return role==='committee_member'||role==='committee_chair';}
export function committeeOutcome(votes,quorum) {
 const approvals=votes.filter(v=>v.decision==='approve').length;
 const rejects=votes.filter(v=>v.decision==='reject').length;
 return {approvals,rejects,ready:approvals>=quorum && approvals>rejects};
}
