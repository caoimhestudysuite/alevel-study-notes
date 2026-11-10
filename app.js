/* Study Notes: Google Drive-backed A-level highlighting app. No credentials embedded. */
const $=id=>document.getElementById(id);
const CATEGORIES=[['Law','Learn','⚖️','#2468aa'],['Law','Explore','⚖️','#2468aa'],['Psychology','Learn','🧠','#8056ae'],['Psychology','Explore','🧠','#8056ae'],['Sociology','Learn','👥','#168778'],['Sociology','Explore','👥','#168778']];
const DRIVE='https://www.googleapis.com/drive/v3/files',UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
const SCOPES='https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email';
const SKEY='study-notes-v4-config',LOCAL='study-notes-v4-library';
const APP_VERSION='6.0';
let config=JSON.parse(localStorage.getItem(SKEY)||'{}'), access='',identity='',tokenClient=null, folderCache={},view='home',category='',week=8,library=[],current=null,pdf=null,slide=0,slides=[],marks={},teacherNotes={},undo=[],noteHistory=[],drag=null,erase=false,finger=false,paragraph=false,debounce=null,notesFileId='',notesCloud={},renderEpoch=0,cloudWriteQueue=Promise.resolve(),lastSaveError='',lessonScanEpoch=0,renderTask=null,scanTimer=null;
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),3500)}
function show(name){view=name;document.querySelectorAll('.view').forEach(e=>e.classList.toggle('hidden',e.id!==name+'View'));window.scrollTo(0,0)}
function localLibrary(){try{return JSON.parse(localStorage.getItem(LOCAL)||'[]')}catch{return []}}
function updateSync(){ $('syncState').textContent=access?'● Google Drive connected':'● Local mode — use backup'; }
function diagnose(err,where){const msg=(err?.message||String(err));lastSaveError=where+': '+msg;$('syncDiagnostic').textContent=lastSaveError;$('syncDiagnostic').classList.remove('hidden');}
function setConfig(){localStorage.setItem(SKEY,JSON.stringify(config));}
function currentAdmin(){return Boolean(access&&identity&&config.adminEmail&&identity.toLowerCase()===config.adminEmail.toLowerCase())}
async function drive(url,opts={}){if(!access)throw Error('Sign in with Google first');const headers={Authorization:'Bearer '+access,...opts.headers};let r=await fetch(url,{...opts,headers});if(!r.ok){let detail=await r.text();throw Error(`Google Drive ${r.status}: ${detail.slice(0,350)}`)}return r;}
async function json(url,opts={}){return (await drive(url,opts)).json()}
async function listChildren(parent){let files=[],page='';do{const qs=new URLSearchParams({q:`'${parent}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType,description,size,createdTime,webViewLink)',pageSize:'1000'});if(page)qs.set('pageToken',page);const r=await json(DRIVE+'?'+qs);files.push(...r.files);page=r.nextPageToken||''}while(page);return files}
async function createFolder(name,parent){return json(DRIVE+'?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[parent]})})}
async function folderNamed(parent,name,create=false){let k=parent+':'+name;if(folderCache[k])return folderCache[k];let f=(await listChildren(parent)).find(x=>x.name===name&&x.mimeType==='application/vnd.google-apps.folder');if(!f&&create)f=await createFolder(name,parent);if(f)folderCache[k]=f.id;return f?.id||''}
async function ensureCategoryFolders(cat,whichWeek,create=false){let root=config.folderId;if(!root)throw Error('Set up the Google Drive library in Account first');for(const name of [cat,`Week ${String(whichWeek).padStart(2,'0')}`]){root=await folderNamed(root,name,create);if(!root)return ''}return root}
function initSubjects(){const el=$('subjectGrid');el.innerHTML='';for(const [subject,kind,icon,color] of CATEGORIES){const b=document.createElement('button');b.className='subject';b.innerHTML=`<span class="badge" style="background:${color}">${icon}</span><strong>${subject}</strong><small>${kind} →</small>`;b.onclick=()=>enterCategory(subject+' '+kind);el.append(b)}$('adminCategory').innerHTML=CATEGORIES.map(([s,k])=>`<option value="${s+' '+k}">${s} ${k}</option>`).join('')}
async function enterCategory(cat){category=cat;show('weeks');$('weeksTitle').textContent=cat;$('weeksHeading').textContent=cat;await drawWeeks()}
async function drawWeeks(){const target=$('weeksList');target.innerHTML='<p>Loading weeks…</p>';try{let rows=[];const root=access&&config.folderId?await folderNamed(config.folderId,category):'';if(root){rows=(await listChildren(root)).filter(f=>/^Week\s+\d+$/i.test(f.name)).map(f=>({week:Number(f.name.match(/\d+/)[0]),id:f.id})).sort((a,b)=>a.week-b.week)}else rows=localLibrary().filter(f=>f.category===category).map(f=>({week:f.week}));rows=[...new Map(rows.map(r=>[r.week,r])).values()].sort((a,b)=>a.week-b.week);target.innerHTML=rows.length?'':'<p>No uploaded weeks yet. Use Admin to add a presentation.</p>';for(const r of rows){const btn=document.createElement('button');btn.className='week';btn.innerHTML=`<strong>Week ${r.week}</strong><span>Open lessons →</span>`;btn.onclick=()=>openWeek(r.week);target.append(btn)}}catch(err){target.textContent=err.message}}
async function openWeek(n){week=n;show('lessons');$('lessonsTitle').textContent=category;$('lessonWeekHeading').textContent=`${category} · Week ${week}`;await listLessons()}
async function listLessons(){const el=$('lessonList');el.innerHTML='<p>Loading presentations…</p>';try{if(access&&config.folderId){const folder=await ensureCategoryFolders(category,week);library=folder?(await listChildren(folder)).filter(f=>f.mimeType==='application/vnd.google-apps.presentation'||f.mimeType==='application/pdf'):[]}else library=localLibrary().filter(f=>f.category===category&&f.week===week);el.innerHTML=library.length?'':'<p>No presentations in this week.</p>';for(const file of library){let button=document.createElement('button');button.className='lesson';button.innerHTML=`<span><strong>${h(file.name)}</strong><small>${file.mimeType==='application/pdf'?'PDF':'PowerPoint slides'} · Tap to open</small></span><span>→</span>`;button.onclick=()=>openLesson(file);el.append(button)}}catch(e){el.textContent=e.message}}
async function pdfLibrary(){if(!window.pdfjsLib)throw Error('PDF renderer could not load. Check internet connection.');window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
async function openLesson(file){
 if(debounce){clearTimeout(debounce);debounce=null;if(current){const prior=current.id, snapshot={marks:structuredClone(marks),notes:{...teacherNotes},updated:new Date().toISOString()};queueCloudSave(prior,snapshot)}}
 if(renderTask){try{renderTask.cancel()}catch{}renderTask=null;}
 current=file;slide=0;slides=[];pdf=null;marks={};teacherNotes={};undo=[];notesFileId='';lessonScanEpoch++;
 show('reader');$('readerSubject').textContent=category||'A-Level Study Notes';$('readerTitle').textContent='Week '+week+' · '+file.name;
 $('lessonTabs').innerHTML='';$('reading').textContent='Loading presentation and its selectable text…';$('syncDiagnostic').classList.add('hidden');$('slideCount').textContent='Loading';
 try{await pdfLibrary();let bytes;if(file.localBytes)bytes=new Uint8Array(file.localBytes);else if(file.mimeType==='application/pdf')bytes=new Uint8Array(await (await drive(`${DRIVE}/${encodeURIComponent(file.id)}?alt=media`)).arrayBuffer());else bytes=new Uint8Array(await (await drive(`${DRIVE}/${encodeURIComponent(file.id)}/export?mimeType=application%2Fpdf`)).arrayBuffer());pdf=await pdfjsLib.getDocument({data:bytes}).promise;slides=new Array(pdf.numPages);const notes=await loadNotes(file.id);marks=notes.marks||{};teacherNotes=notes.notes||{};await renderSlide();const scan=++lessonScanEpoch;renderLessonShortcuts();scanTimer=setTimeout(()=>detectLessonSections(pdf,scan),900)}catch(err){$('reading').textContent='Could not open this presentation: '+err.message;toast('Presentation load failed')}
}
function renderLessonShortcuts(){
 const nav=$('lessonTabs');nav.replaceChildren();if(!pdf||!current)return;
 // Immediate shortcut for the known Week 8 presentation; zero 110-page scan delay.
 if(pdf.numPages===110&&/statutory interpretation/i.test(current.name)){
  for(const [name,n] of [['Lesson 1 · Literal',0],['Lesson 2 · Golden',41],['Lesson 3 · Mischief',76]]){
   const b=document.createElement('button');b.textContent=name;b.onclick=()=>goSlide(n);nav.append(b);
  }
 }
}
async function detectLessonSections(document,epoch){
 // For other documents: scan in small batches with yields to keep Pencil interactions responsive.
 if(document.numPages===110&&/statutory interpretation/i.test(current?.name||''))return;
 const found=[];
 for(let n=0;n<document.numPages;n++){
  if(epoch!==lessonScanEpoch||document!==pdf)return;
  try{
   const page=await document.getPage(n+1),tc=await page.getTextContent();
   const text=tc.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').toLowerCase();
   if(/this lesson is being recorded/.test(text)&&(found.length===0||n>found[found.length-1]+5))found.push(n);
   page.cleanup();
  }catch(e){console.warn('Lesson scan',e)}
  if(n%4===3)await new Promise(r=>setTimeout(r,12));
 }
 if(epoch!==lessonScanEpoch||document!==pdf||found.length<2)return;
 if(found[0]!==0)found.unshift(0);
 const nav=$('lessonTabs');nav.replaceChildren();
 found.forEach((n,k)=>{const b=document.createElement('button');b.textContent=`Lesson ${k+1} · Slide ${n+1}`;b.onclick=()=>goSlide(n);nav.append(b)});
}

async function loadPage(n){if(slides[n])return slides[n];const p=await pdf.getPage(n+1);const tc=await p.getTextContent();const blocks=[];for(const item of tc.items){if(!item.str||!item.str.trim())continue;const y=item.transform[5],x=item.transform[4],last=blocks.at(-1);if(last&&Math.abs(last.y-y)<3.5&&Math.abs(x-last.right)<28){last.text+=' '+item.str;last.right=x+item.width}else blocks.push({text:item.str,x,y,right:x+item.width})}slides[n]={pdfPage:p,blocks};return slides[n]}
function markedKey(i){return `${slide}:${i}`}
function unite(xs){xs=xs.filter(([a,b])=>b>a).sort((p,q)=>p[0]-q[0]);let out=[];for(const [a,b] of xs){const last=out.at(-1);if(last&&a<=last[1])last[1]=Math.max(last[1],b);else out.push([a,b])}return out}
function subtract(xs,a,b){return xs.flatMap(([x,y])=>b<=x||a>=y?[[x,y]]:[[x,Math.min(a,y)],[Math.max(b,x),y]].filter(([s,e])=>e>s))}
function rangesHTML(text,ranges){let out='',last=0;for(const [a,b] of unite(ranges)){out+=h(text.slice(last,a))+'<mark>'+h(text.slice(a,b))+'</mark>';last=b}return out+h(text.slice(last))}
async function renderSlide(){
 if(!pdf)return;const epoch=++renderEpoch;
 const data=await loadPage(slide);if(epoch!==renderEpoch)return;
 // Update text immediately; the image render is allowed to finish afterwards.
 const reading=$('reading');reading.replaceChildren();
 for(let i=0;i<data.blocks.length;i++){
  const b=data.blocks[i],div=document.createElement('div');div.className='block';div.dataset.block=i;
  div.innerHTML=rangesHTML(b.text,marks[markedKey(i)]||[]);
  div.onclick=()=>{if(paragraph)applyRange(i,0,b.text.length)};reading.append(div);
 }
 $('teacherNote').value=teacherNotes[slide]||'';
 $('slideCount').textContent=`${slide+1} / ${pdf.numPages}`;$('slideGoto').value=slide+1;
 $('slideGoto').max=pdf.numPages;$('imageSlideNum').textContent=`Slide ${slide+1}`;
 $('selectionCount').textContent=`${Object.keys(marks).filter(k=>k.startsWith(slide+':')&&marks[k]?.length).length} marked blocks`;
 const canvas=$('slideCanvas'),ctx=canvas.getContext('2d',{alpha:false});
 const boxWidth=Math.max(320,Math.min(920,canvas.parentElement.clientWidth||550));
 const v1=data.pdfPage.getViewport({scale:1});
 // Mobile Safari benefits from a bounded canvas: limit effective resolution and memory.
 const scale=Math.min(1.35,boxWidth/v1.width*1.2);
 const viewport=data.pdfPage.getViewport({scale});
 if(renderTask){try{renderTask.cancel()}catch{}renderTask=null}
 canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
 canvas.style.aspectRatio=viewport.width+'/'+viewport.height;
 renderTask=data.pdfPage.render({canvasContext:ctx,viewport});
 try{await renderTask.promise}catch(e){if(e?.name!=='RenderingCancelledException')console.warn('Slide image render',e)}
 finally{renderTask=null}
}

function record(){undo.push(JSON.stringify(marks));if(undo.length>60)undo.shift()}
function applyRange(i,a,b){const data=slides[slide].blocks[i],len=data.text.length;a=Math.max(0,Math.min(a,len));b=Math.max(0,Math.min(b,len));if(a>b)[a,b]=[b,a];if(a===b)return;while(a>0&&!/\s/.test(data.text[a-1]))a--;while(b<len&&!/\s/.test(data.text[b]))b++;const k=markedKey(i),old=JSON.stringify(marks[k]||[]);const next=erase?subtract(marks[k]||[],a,b):unite([...(marks[k]||[]),[a,b]]);if(JSON.stringify(next)===old)return;record();marks[k]=next;saveNotesSoon();renderTextOnly()}
function renderTextOnly(){const blockData=slides[slide]?.blocks||[];$('reading').querySelectorAll('.block').forEach((node,i)=>{node.innerHTML=rangesHTML(blockData[i].text,marks[markedKey(i)]||[])});$('selectionCount').textContent=`${Object.keys(marks).filter(k=>k.startsWith(slide+':')&&marks[k]?.length).length} marked blocks`}
function caret(x,y){let r=document.caretRangeFromPoint?.(x,y);if(!r&&document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p){r=document.createRange();r.setStart(p.offsetNode,p.offset);r.collapse(true)}}if(!r)return null;const block=(r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement)?.closest('.block');if(!block||!$('reading').contains(block))return null;const pre=document.createRange();pre.selectNodeContents(block);try{pre.setEnd(r.startContainer,r.startOffset)}catch{return null}return {block:Number(block.dataset.block),offset:pre.toString().length}}
function locatePointer(e){return caret(e.clientX,e.clientY)}
$('reading').addEventListener('pointerdown',e=>{if(!pdf||(!finger&&e.pointerType!=='pen'))return;const start=locatePointer(e);if(!start)return;e.preventDefault();drag={id:e.pointerId,start,end:start,x:e.clientX,y:e.clientY};$('reading').classList.add('dragging');try{$('reading').setPointerCapture(e.pointerId)}catch{}});
$('reading').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();drag.end=locatePointer(e)||drag.end;drag.x=e.clientX;drag.y=e.clientY},{passive:false});
$('reading').addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const g=drag;drag=null;$('reading').classList.remove('dragging');const end=locatePointer(e)||g.end;const lo=Math.min(g.start.block,end.block),hi=Math.max(g.start.block,end.block);if(hi-lo>15)return;for(let i=lo;i<=hi;i++){let a=0,b=slides[slide].blocks[i].text.length;if(g.start.block===end.block){a=g.start.offset;b=end.offset}else if(g.start.block<end.block){if(i===lo)a=g.start.offset;if(i===hi)b=end.offset}else{if(i===lo)a=end.offset;if(i===hi)b=g.start.offset}applyRange(i,a,b)}});
$('reading').addEventListener('pointercancel',()=>{drag=null;$('reading').classList.remove('dragging')});
async function goSlide(n){if(!pdf||n<0||n>=pdf.numPages)return;slide=n;window.getSelection()?.removeAllRanges();await renderSlide()}
function localNoteKey(id){return `study-notes-v4-notes:${id}`}
async function loadNotes(id){
 let local={};try{local=JSON.parse(localStorage.getItem(localNoteKey(id))||'{}')}catch{}
 if(!access||id.startsWith('local-'))return local;
 try{const cloud=await readCloudNotes(id);if(!cloud)return local;return new Date(local.updated||0)>new Date(cloud.updated||0)?local:cloud}
 catch(e){console.warn('Cloud note read failed',e);diagnose(e,'Load notes');$('syncState').textContent='⚠ Notes on this device';$('retryCloud').classList.remove('hidden');return local}
}
function queueCloudSave(lessonId,payload){
 if(!access||lessonId.startsWith('local-'))return Promise.resolve();
 cloudWriteQueue=cloudWriteQueue.catch(()=>{}).then(async()=>{
   try{await writeCloudNotes(lessonId,payload);if(current?.id===lessonId){$('syncState').textContent='✓ Synced to Drive';$('retryCloud').classList.add('hidden');lastSaveError='';$('syncDiagnostic').classList.add('hidden')}}
   catch(e){console.error('Cloud save failed',e);diagnose(e,'Save notes');if(current?.id===lessonId){$('syncState').textContent='⚠ Saved locally · Cloud sync failed';$('retryCloud').classList.remove('hidden')}}
 });
 return cloudWriteQueue;
}
function saveNotesSoon(){
 if(!current)return;
 const lessonId=current.id,payload={marks:JSON.parse(JSON.stringify(marks)),notes:{...teacherNotes},updated:new Date().toISOString()};
 localStorage.setItem(localNoteKey(lessonId),JSON.stringify(payload));
 $('syncState').textContent=access?'Saving to Drive…':'✓ Saved on this device';
 clearTimeout(debounce);
 debounce=setTimeout(()=>{debounce=null;queueCloudSave(lessonId,payload)},4500);
}
async function getNoteFolder(){
 if(!config.folderId)throw Error('Set the Study Notes library folder in Account');
 // Ordinary private Drive folder, not the special appDataFolder (which requires extra OAuth scopes).
 return folderNamed(config.folderId,'.Study Notes - Saved Highlights',true);
}
async function findNoteFile(id){
 const folder=await getNoteFolder();const name='study-notes-'+id+'.json';
 return (await listChildren(folder)).find(f=>f.name===name&&f.mimeType==='application/json')||null;
}
async function readCloudNotes(id){
 if(!access)return null;
 const file=await findNoteFile(id);if(!file)return null;notesCloud[id]=file.id;
 const result=await drive(`${DRIVE}/${encodeURIComponent(file.id)}?alt=media`);return result.json();
}
async function writeCloudNotes(id,payload){
 const existing=notesCloud[id]?{id:notesCloud[id]}:await findNoteFile(id);
 if(existing){await drive(`${UPLOAD}/${encodeURIComponent(existing.id)}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});notesCloud[id]=existing.id}
 else{const folder=await getNoteFolder();const saved=await multipartUpload(new Blob([JSON.stringify(payload)],{type:'application/json'}),{name:'study-notes-'+id+'.json',parents:[folder],mimeType:'application/json'});notesCloud[id]=saved.id}
}

async function multipartUpload(file,metadata){const boundary='study_notes_'+Date.now();const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${file.type||'application/octet-stream'}\r\n\r\n`,file,`\r\n--${boundary}--`]);return json(UPLOAD+'?uploadType=multipart&fields=id,name,mimeType',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body})}
async function resumableUpload(file,metadata){const session=await drive(UPLOAD+'?uploadType=resumable&fields=id,name,mimeType',{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':file.type||'application/vnd.openxmlformats-officedocument.presentationml.presentation','X-Upload-Content-Length':String(file.size)},body:JSON.stringify(metadata)});const loc=session.headers.get('Location');if(!loc)throw Error('Google did not return an upload session URL');return json(loc,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file})}
function noteBackup(){if(!current)return;const body=JSON.stringify({version:4,lessonId:current.id,lesson:current.name,marks,notes:teacherNotes},null,2);downloadBlob(new Blob([body],{type:'application/json'}),'study-notes-'+current.id+'.json')}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2500)}
async function revision(){if(!pdf)return;show('revision');$('revisionSub').textContent=current.name+' · '+pdf.numPages+' slides';const el=$('revisionContent');el.innerHTML='<p>Preparing highlighted extracts…</p>';let output=[];for(let page=0;page<pdf.numPages;page++){const keys=Object.keys(marks).filter(k=>k.startsWith(page+':')&&marks[k]?.length);const note=teacherNotes[page]||'';if(!keys.length&&!note)continue;const data=await loadPage(page);let quotes=[];for(const k of keys){const ix=Number(k.split(':')[1]);for(const [a,b] of marks[k]){const text=data.blocks[ix]?.text.slice(a,b).trim();if(text)quotes.push(text)}}let heading=data.blocks.find(b=>b.text.length<100)?.text||'Slide '+(page+1);output.push(`<article><h2>${h(heading)} <small>· Slide ${page+1}</small></h2>${quotes.map(q=>`<p>${h(q)}</p>`).join('')}${note?`<p class="note"><b>Teacher's note:</b> ${h(note)}</p>`:''}</article>`)}el.innerHTML=output.join('')||'<p>No highlighted text yet.</p>'}
function connect(){if(!config.clientId)return toast('Enter your Google OAuth client ID in Account first');if(!window.google?.accounts?.oauth2)return toast('Google sign-in is not available yet');tokenClient=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:SCOPES,callback:async resp=>{if(resp.error){toast(resp.error);return}access=resp.access_token;notesFileId='';try{const r=await drive('https://www.googleapis.com/oauth2/v3/userinfo');const who=await r.json();identity=who.email||'';$('whoAmI').textContent='Signed in: '+identity;updateSync();show('home');toast('Connected to Google Drive')}catch(e){toast(e.message)}}});tokenClient.requestAccessToken({prompt:'consent'})}
async function uploadFile(){if(!currentAdmin())return toast('Sign in as the library owner to upload');const file=$('adminFile').files[0],cat=$('adminCategory').value,n=Number($('adminWeek').value),title=$('adminTitle').value.trim()||file?.name?.replace(/\.[^.]+$/,'');if(!file||!n)return toast('Select a file and week');if(!/\.(pptx|pdf)$/i.test(file.name))return toast('Choose a PPTX or PDF');const status=$('uploadStatus');$('uploadBtn').disabled=true;status.textContent='Preparing Google Drive folder…';try{const folder=await ensureCategoryFolders(cat,n,true);status.textContent='Uploading presentation securely…';let metadata={name:title,parents:[folder],mimeType:/\.pptx$/i.test(file.name)?'application/vnd.google-apps.presentation':'application/pdf',description:`Study Notes · ${cat} · Week ${n}`};const uploaded=await resumableUpload(file,metadata);status.textContent='Uploaded '+uploaded.name+'. The presentation is now available in Week '+n+'.';$('adminFile').value='';folderCache={};toast('Lesson published');await drawAdmin()}catch(err){status.textContent='Upload failed: '+err.message}finally{$('uploadBtn').disabled=false}}
async function drawAdmin(){const el=$('manageList');if(!currentAdmin()){el.innerHTML='<p>Sign in with the dedicated owner Google account to manage lessons.</p>';return}el.textContent='Loading lessons…';try{let items=[];for(const [subject,kind] of CATEGORIES){const c=subject+' '+kind;const root=await folderNamed(config.folderId,c);if(!root)continue;for(const folder of (await listChildren(root)).filter(f=>f.mimeType==='application/vnd.google-apps.folder')){for(const file of await listChildren(folder.id)){if(file.mimeType==='application/pdf'||file.mimeType==='application/vnd.google-apps.presentation')items.push({...file,category:c,week:folder.name})}}}el.innerHTML=items.length?'':'<p>No uploads yet.</p>';for(const f of items){let line=document.createElement('div');line.className='manageRow';const text=document.createElement('span');text.textContent=`${f.category} · ${f.week} · ${f.name}`;const del=document.createElement('button');del.textContent='Remove';del.className='danger';del.onclick=async()=>{if(!confirm('Remove '+f.name+' from the library? This may affect existing annotations.'))return;try{await drive(DRIVE+'/'+f.id,{method:'DELETE'});toast('Presentation removed');await drawAdmin()}catch(e){toast(e.message)}};line.append(text,del);el.append(line)}}catch(e){el.textContent=e.message}}
async function setupFolder(){if(!currentAdmin())return toast('Sign in as the dedicated owner first');try{const root=await folderNamed('root','A-Level Study Notes',true);config.folderId=root;setConfig();$('folderId').value=root;toast('Private library folder created');await drawAdmin()}catch(e){toast(e.message)}}
async function shareFolder(){if(!currentAdmin()||!config.folderId)return toast('Create the library first');const email=$('studentEmail').value.trim();if(!email)return toast('Enter the student Google account email');if(!confirm(`Grant ${email} read-only access to the full study library?`))return;try{await json(`${DRIVE}/${config.folderId}/permissions?sendNotificationEmail=true`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'user',role:'reader',emailAddress:email})});toast('Library shared with student')}catch(e){toast(e.message)}}
function localImport(){const input=document.createElement('input');input.type='file';input.accept='.pdf,application/pdf';input.onchange=async()=>{const f=input.files?.[0];if(!f)return;const entry={id:'local-'+f.name+'-'+f.size,name:f.name,mimeType:'application/pdf',category:category||'Law Learn',week:week||8,localBytes:new Uint8Array(await f.arrayBuffer())};await openLesson(entry);toast('Local PDF loaded. Reopen the same file later to resume saved notes. Export backups regularly.')};input.click()}
// Navigation and controls
$('tryPdf').onclick=localImport;$('homeBtn').onclick=$('goHome').onclick=()=>show('home');$('accountBtn').onclick=()=>{show('account');refreshAccount()};$('backWeeks').onclick=()=>enterCategory(category);$('backLessons').onclick=()=>openWeek(week);$('previous').onclick=()=>goSlide(slide-1);$('following').onclick=()=>goSlide(slide+1);$('slideGoto').onchange=e=>goSlide(Number(e.target.value)-1);
$('pencilBtn').onclick=()=>{erase=false;$('pencilBtn').classList.add('active');$('eraseBtn').classList.remove('active')};$('eraseBtn').onclick=()=>{erase=true;$('eraseBtn').classList.add('active');$('pencilBtn').classList.remove('active')};$('fingerBtn').onclick=()=>{finger=!finger;$('fingerBtn').textContent='Finger: '+(finger?'ON':'OFF');$('fingerBtn').classList.toggle('active',finger)};$('paragraphBtn').onclick=()=>{paragraph=!paragraph;$('paragraphBtn').textContent='Paragraph: '+(paragraph?'ON':'OFF');$('paragraphBtn').classList.toggle('active',paragraph)};$('undoBtn').onclick=()=>{if(undo.length){marks=JSON.parse(undo.pop());renderTextOnly();saveNotesSoon()}};
$('teacherNote').oninput=e=>{noteHistory.push({slide,value:teacherNotes[slide]||''});if(noteHistory.length>100)noteHistory.shift();teacherNotes[slide]=e.target.value;saveNotesSoon()};$('deleteWord').onclick=()=>{const area=$('teacherNote'),text=area.value;let a=area.selectionStart,b=area.selectionEnd;if(a===b){while(a>0&&/\s/.test(text[a-1]))a--;while(a>0&&!/\s/.test(text[a-1]))a--}const result=text.slice(0,a)+text.slice(b);area.value=result;teacherNotes[slide]=result;saveNotesSoon();area.focus();area.setSelectionRange(a,a)};$('undoText').onclick=()=>{if(!noteHistory.length)return;let j=noteHistory.length-1;while(j>=0&&noteHistory[j].slide!==slide)j--;if(j<0)return;const result=noteHistory.splice(j,1)[0].value;$('teacherNote').value=result;teacherNotes[slide]=result;saveNotesSoon()};
$('revisionBtn').onclick=revision;$('returnReader').onclick=()=>show('reader');$('printRevision').onclick=()=>print();$('exportLesson').onclick=noteBackup;$('importLesson').onclick=()=>$('importJson').click();$('importJson').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!data.marks||!data.notes)throw Error('Unrecognised file');if(!confirm('Replace this lesson’s current highlights and notes?'))return;marks=data.marks;teacherNotes=data.notes;saveNotesSoon();await revision();toast('Backup restored')}catch(err){toast(err.message)}};
$('copyDiagnostic').onclick=()=>{navigator.clipboard?.writeText(lastSaveError||'No sync error recorded').then(()=>toast('Diagnostic copied')).catch(()=>toast(lastSaveError||'No error recorded'))};
$('retryCloud').onclick=()=>{if(current){saveNotesSoon();toast('Trying to sync this lesson again')}};$('refreshCloud').onclick=drawWeeks;$('openAdmin').onclick=()=>{show('admin');drawAdmin()};$('uploadBtn').onclick=uploadFile;$('exportLibrary').onclick=()=>downloadBlob(new Blob([JSON.stringify({library:localLibrary(),exported:new Date().toISOString()},null,2)],{type:'application/json'}),'study-notes-local-library.json');
$('saveConfig').onclick=()=>{config={...config,clientId:$('clientId').value.trim(),folderId:$('folderId').value.trim(),adminEmail:$('adminEmail').value.trim().toLowerCase()};setConfig();toast('Settings saved on this device')};$('connectGoogle').onclick=connect;$('disconnectGoogle').onclick=()=>{if(access&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(access,()=>{});access='';identity='';notesFileId='';updateSync();refreshAccount();toast('Disconnected')};$('setupFolder').onclick=setupFolder;$('shareFolder').onclick=shareFolder;
function refreshAccount(){$('clientId').value=config.clientId||'';$('folderId').value=config.folderId||'';$('adminEmail').value=config.adminEmail||'';$('whoAmI').textContent=identity?'Signed in: '+identity:'Not signed in to Google';}
initSubjects();refreshAccount();updateSync();show('home');
