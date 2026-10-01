from pathlib import Path
import json,re,subprocess,sys
import cv2,imageio_ffmpeg
from PIL import Image

out=Path(__file__).resolve().parents[1]
ff=imageio_ffmpeg.get_ffmpeg_exe()
requested=sys.argv[1:] or ['landscape','portrait']
report=json.loads((out/'verification.json').read_text(encoding='utf-8')) if (out/'verification.json').exists() else []
report=[r for r in report if r['aspect'] not in requested]
for aspect in requested:
    path=out/f'삼류연정-먹그림-티저-{aspect}.mp4'
    decode=subprocess.run([ff,'-hide_banner','-v','error','-i',str(path),'-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
    if decode.returncode or decode.stderr.strip():raise RuntimeError(decode.stderr)
    video=cv2.VideoCapture(str(path))
    w,h,fps,n=(int(video.get(cv2.CAP_PROP_FRAME_WIDTH)),int(video.get(cv2.CAP_PROP_FRAME_HEIGHT)),video.get(cv2.CAP_PROP_FPS),int(video.get(cv2.CAP_PROP_FRAME_COUNT)))
    assert (w,h)==((1920,1080) if aspect=='landscape' else (1080,1920))
    assert fps==30 and n==1200
    for second in [0.9,7.3,14.8,23.1,30.4,36.6]:
        video.set(cv2.CAP_PROP_POS_MSEC,second*1000)
        ok,frame=video.read()
        if not ok:raise RuntimeError('Decoded frame missing')
        Image.fromarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)).save(out/'source'/f'final-{aspect}-{second}.jpg',quality=95)
        if second==36.6:Image.fromarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)).save(out/'source'/f'poster-{aspect}.jpg',quality=96)
    video.release()
    loud=subprocess.run([ff,'-hide_banner','-i',str(path),'-af','loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
    found=re.search(r'\{\s*"input_i".*?\}',loud.stderr,re.S)
    audio=json.loads(found.group()) if found else {}
    assert audio and float(audio['input_tp'])<0
    assert -20<float(audio['input_i'])<-16
    result={'aspect':aspect,'file':path.name,'width':w,'height':h,'fps':fps,'frames':n,'seconds':n/fps,'bytes':path.stat().st_size,'full_decode':'passed','audio':audio}
    report.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
