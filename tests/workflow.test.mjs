import test from 'node:test';
import assert from 'node:assert/strict';
import {stages,roles,docs,missingDocs,committeeOutcome,validateProject,canAdvance,previousStage,canVote} from '../server/workflow.mjs';
test('stage IDs are unique and transitions resolve',()=>{
 const ids=stages.map(s=>s.id);
 assert.equal(ids.length,new Set(ids).size);
 for(const s of stages) if(s.next) assert.ok(ids.includes(s.next),s.id);
});
test('every approval role exists',()=>{
 for(const s of stages) if(s.role) assert.ok(roles[s.role]);
});
test('required documents exist in registry',()=>{
 const keys=new Set(docs.map(d=>d.key));
 for(const s of stages)for(const k of s.required)assert.ok(keys.has(k),k);
});
test('submission blocks a missing study',()=>{
 assert.deepEqual(missingDocs('draft',[]),['study']);
 assert.deepEqual(missingDocs('draft',['study']),[]);
});
test('committee quorum and dissent are respected',()=>{
 assert.equal(committeeOutcome([{decision:'approve'}],2).ready,false);
 assert.equal(committeeOutcome([{decision:'approve'},{decision:'approve'}],2).ready,true);
 assert.equal(committeeOutcome([{decision:'approve'},{decision:'approve'},{decision:'reject'},{decision:'reject'}],2).ready,false);
});
test('role cannot approve stage belonging to another committee',()=>{
 assert.equal(canAdvance('opening_committee','bid_analysis'),false);
 assert.equal(canAdvance('analysis_committee','bid_analysis'),true);
 assert.equal(canVote('finance'),false);
});
test('return follows the previous stage',()=>{
 assert.equal(previousStage('bid_analysis'),'bid_opening');
 assert.equal(previousStage('engineering_review'),'draft');
});
test('project enforces core fields and positive budgets',()=>{
 assert.throws(()=>validateProject({title:'قصير'}));
 assert.doesNotThrow(()=>validateProject({title:'تأهيل مشروع مياه في القضاء',governorate:'ذي قار',district:'الناصرية',beneficiary:'دائرة الماء',estimated_cost:100,total_cost:120}));
});
