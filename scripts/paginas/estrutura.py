import re,sys
from html.parser import HTMLParser
VOID={'meta','link','br','img','input','hr','source','path','circle','rect','line','use'}
class P(HTMLParser):
    def __init__(s,src): super().__init__(convert_charrefs=False); s.src=src; s.stack=[]; s.items=[]
    def pos(s):
        l,c=s.getpos(); 
        return sum(len(x) for x in s.lines[:l-1])+c
    def feed2(s):
        s.lines=s.src.splitlines(True); s.feed(s.src)
    def handle_starttag(s,tag,attrs):
        if tag in VOID: return
        a=dict(attrs); st=s.pos()
        s.stack.append((tag,st,a))
    def handle_startendtag(s,tag,attrs): pass
    def handle_endtag(s,tag):
        if tag in VOID: return
        while s.stack:
            t,st,a=s.stack.pop()
            if t==tag:
                en=s.pos()+len(tag)+3
                s.items.append((len(s.stack),t,st,en,a)); break
def outline(path, depth_from_id='main', maxlen=70):
    src=open(path,encoding='utf-8').read(); p=P(src); p.feed2()
    # find the container of #leitura-local
    it=[x for x in p.items]
    return src,it
if __name__=='__main__':
    path=sys.argv[1]; src,it=outline(path)
    # find the element with id leitura-local or a given id, then print its parent's children
    target=sys.argv[2] if len(sys.argv)>2 else 'leitura-local'
    el=[x for x in it if x[4].get('id')==target]
    if not el: print('no',target); sys.exit()
    d,t,st,en,a=el[0]
    # parent = smallest item containing it at depth d-1
    par=[x for x in it if x[0]==d-1 and x[2]<=st and x[3]>=en][0]
    print('parent',par[1],par[4].get('class'),par[4].get('id'),par[2],par[3])
    for x in sorted([x for x in it if x[0]==d and x[2]>=par[2] and x[3]<=par[3]],key=lambda x:x[2]):
        txt=re.sub(r'<[^>]+>','',src[x[2]:x[3]]); txt=re.sub(r'\s+',' ',txt)[:70]
        print(x[2],x[3],x[1],x[4].get('class'),x[4].get('id'),'|',txt)
