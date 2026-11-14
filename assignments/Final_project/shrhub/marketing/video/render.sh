#!/bin/bash
# Сборка вертикального ролика SHRhub: каждая сцена — отдельный файл, потом склейка без перекодирования.
set -e
cd /home/claude/video
ENC="-c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -r 30"

scene () {           # $1 картинка, $2 кадров, $3 имя
  local f=$2
  local fo=$((f-8))
  ffmpeg -y -loglevel error -i "$1" \
    -vf "zoompan=z='min(zoom+0.00045,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${f}:s=1080x1920:fps=30,fade=t=in:st=0:d=0.27,fade=t=out:st=$(echo "scale=2;($fo)/30"|bc):d=0.27,format=yuv420p" \
    $ENC "tmp_$3.mp4"
  mv "tmp_$3.mp4" "$3.mp4"
  echo "  готово $3"
}

scene s1.jpg 90  v1
scene s2.jpg 108 v2
scene s3.jpg 90  v3
scene s4.jpg 120 v4
scene s5.jpg 102 v5
scene s6.jpg 112 v6

printf "file 'v1.mp4'\nfile 'v2.mp4'\nfile 'v3.mp4'\nfile 'v4.mp4'\nfile 'v5.mp4'\nfile 'v6.mp4'\n" > list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c copy tmp_shrhub.mp4
mv tmp_shrhub.mp4 shrhub-tiktok.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 shrhub-tiktok.mp4
