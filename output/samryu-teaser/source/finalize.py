from pathlib import Path
import subprocess,json,re
import cv2,imageio_ffmpeg
from PIL import Image

out=Path(__file__).resolve().parents[1]
ff=imageio_ffmpeg.get_ffmpeg_exe()
report=[]
for aspect in ['landscape','portrait']:
    path=out/f'삼류연정-티저-{aspect}.mp4'
    temp=out/'source'/f'normalized-{aspect}.mp4'
    subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(path),'-i',str(out/'source/soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-map_metadata','0','-c:v','copy','-af','loudnorm=I=-18:TP=-1.5:LRA=11','-c:a','aac','-b:a','256k','-ar','48000','-t','36','-movflags','+faststart',str(temp)],check=True)
    temp.replace(path)
    decode=subprocess.run([ff,'-hide_banner','-v','error','-i',str(path),'-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
    if decode.returncode or decode.stderr.strip():raise RuntimeError(decode.stderr)
    vc=cv2.VideoCapture(str(path))
    w,h,fps,n=(int(vc.get(cv2.CAP_PROP_FRAME_WIDTH)),int(vc.get(cv2.CAP_PROP_FRAME_HEIGHT)),vc.get(cv2.CAP_PROP_FPS),int(vc.get(cv2.CAP_PROP_FRAME_COUNT)))
    assert (w,h)==((1920,1080) if aspect=='landscape' else (1080,1920))
    assert fps==30 and n==1080
    for seconds in [6.7,11.5,30.8]:
        vc.set(cv2.CAP_PROP_POS_MSEC,seconds*1000)
        ok,frame=vc.read()
        if not ok:raise RuntimeError('Decoded frame missing')
        Image.fromarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)).save(out/'source'/f'final-{aspect}-{seconds}.jpg',quality=94)
    vc.release()
    loud=subprocess.run([ff,'-hide_banner','-i',str(path),'-af','loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
    found=re.search(r'\{\s*"input_i".*?\}',loud.stderr,re.S)
    audio=json.loads(found.group()) if found else {}
    if float(audio.get('input_tp',0))>0:raise RuntimeError('Audio peak exceeds 0 dBTP')
    result={'aspect':aspect,'file':path.name,'width':w,'height':h,'fps':fps,'frames':n,'seconds':n/fps,'bytes':path.stat().st_size,'full_decode':'passed','audio':audio}
    report.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
