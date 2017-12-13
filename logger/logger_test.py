import docker
import re
import Queue, threading

def gen_multiplex(genlist):
    
    item_q = Queue.Queue()
    
    def run_one(source):
        
        for item in source: item_q.put(item)
        

        
    def run_all():
        
        thrlist = []
        
        for source in genlist:
            
            t = threading.Thread(target=run_one,args=(source,))
            
            t.start()
            
            thrlist.append(t)
            
        for t in thrlist: t.join()
        
        item_q.put(StopIteration)
        

        
    threading.Thread(target=run_all).start()
    
    while True:
        
        item = item_q.get()
        
        if item is StopIteration: return
        
        yield item

        
client = docker.from_env()
project = "feeders"
def containers(project):
    for c in client.containers.list():
        m = re.match(project+"_(.+)_\d+", c.name)
        if m:
            yield c.logs(stream=True)


for line in gen_multiplex(containers(project)):
    print(line)
