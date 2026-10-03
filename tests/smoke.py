# Loads every page as each role at 1440px and 390px; reports JS errors, overflow and broken links.
# Needs: pip install playwright && playwright install chromium. Serve first: python3 -m http.server 8765
import asyncio, json, re, sys, os
from playwright.async_api import async_playwright
BASE='http://localhost:8765/'
import importlib.util
spec=importlib.util.spec_from_file_location('b',os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'tools','build-pages.py'))
src=open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'tools','build-pages.py')).read()
PAGES=eval(src[src.index('PAGES = [')+8:src.index(']\nCSS')+1])
USERS={'student':{'id':'stu_001','role':'student','name':'Priya Sharma','email':'student@hukhire.com','status':'active'},
 'proctor':{'id':'prc_001','role':'proctor','name':'Daniel Fernandes','email':'proctor@hukhire.com','status':'active'},
 'admin':{'id':'adm_001','role':'admin','name':'Ananya Rao','email':'admin@hukhire.com','status':'active'}}
QS={'student/exam-details.html':'?id=exam_001','student/system-check.html':'?id=exam_001','student/instructions.html':'?id=exam_001','student/take-exam.html':'?id=exam_001',
 'student/result-detail.html':'?id=res_005_001','student/submitted.html':'?attempt=att_005_001',
 'proctor/console.html':'?session=sess_001','proctor/candidate.html':'?session=sess_001&candidate=cand_002_002','proctor/session-summary.html':'?session=sess_003',
 'admin/exam-detail.html':'?id=exam_001','admin/exam-wizard.html':'?id=exam_008','admin/question-editor.html':'?id=q_003','admin/student-profile.html':'?id=stu_001',
 'admin/proctor-profile.html':'?id=prc_005','admin/result-detail.html':'?id=res_005_001','reset-password.html':'?token=x'}
async def main():
  bad=0; links=set()
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for vw in [(1440,900),(390,844)]:
     for path,pid,role,layout,title,group in PAGES:
      roles=[role] if role in USERS else (['student','admin','proctor'] if layout=='app' else [None])
      for r in roles:
        ctx=await b.new_context(viewport={'width':vw[0],'height':vw[1]})
        if r: await ctx.add_init_script("localStorage.setItem('huk_session',JSON.stringify({token:'t',user:%s}))"%json.dumps(USERS[r]))
        await ctx.route(re.compile(r'fonts\.(googleapis|gstatic)'), lambda route: route.abort())
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and '403' not in m.text else None)
        await pg.goto(BASE+path+QS.get(path,''),wait_until='load'); await pg.wait_for_timeout(1500)
        txt=await pg.inner_text('body')
        if 'didn’t load' in txt or 'not registered' in txt: errs.append('ERROR STATE: '+txt[:200].replace('\n',' '))
        if pg.url.split('?')[0]!=BASE+path and 'take-exam' not in path: errs.append('redirected to '+pg.url)
        for h in await pg.eval_on_selector_all('a[href]','els=>els.map(e=>e.href)'): links.add(h)
        # overflow check on mobile
        if vw[0]<500:
          ow=await pg.evaluate('document.documentElement.scrollWidth-window.innerWidth')
          if ow>2: errs.append('horizontal overflow %dpx'%ow)
        if errs: bad+=1; print(vw[0],path,r,'\n   '+'\n   '.join(errs[:5]))
        await ctx.close()
    # link check
    import urllib.request
    broken=[]
    for h in sorted(links):
      if not h.startswith(BASE): continue
      u=h.split('#')[0].split('?')[0]
      try: urllib.request.urlopen(u)
      except Exception as e: broken.append(h)
    print('links checked',len(links),'broken',broken)
    await b.close()
  print('pages with problems:',bad)
asyncio.run(main())
