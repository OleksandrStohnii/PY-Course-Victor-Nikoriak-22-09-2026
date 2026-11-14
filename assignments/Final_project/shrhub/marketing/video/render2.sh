#!/bin/bash
set -e
cd /home/claude/video
ENC="-c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -r 30"
scene () {
  local f=$2; local fo=$((f-8))
  ffmpeg -y -loglevel error -i "$1" \
    -vf "zoompan=z='min(zoom+0.00045,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${f}:s=1080x1920:fps=30,fade=t=in:st=0:d=0.27,fade=t=out:st=$(echo "scale=2;($fo)/30"|bc):d=0.27,format=yuv420p" \
    $ENC "tmp_$3.mp4"
  mv "tmp_$3.mp4" "$3.mp4"
}
scene b1.jpg 90  w1
scene b2.jpg 108 w2
scene b3.jpg 108 w3
scene b4.jpg 102 w4
scene b5.jpg 110 w5
printf "file 'w1.mp4'\nfile 'w2.mp4'\nfile 'w3.mp4'\nfile 'w4.mp4'\nfile 'w5.mp4'\n" > l2.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i l2.txt -c copy tmp_a.mp4 && mv tmp_a.mp4 shrhub-prognozy.mp4

scene c1.jpg 96  u1
scene c2.jpg 90  u2
scene c3.jpg 102 u3
scene c4.jpg 114 u4
scene c5.jpg 110 u5
printf "file 'u1.mp4'\nfile 'u2.mp4'\nfile 'u3.mp4'\nfile 'u4.mp4'\nfile 'u5.mp4'\n" > l3.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i l3.txt -c copy tmp_b.mp4 && mv tmp_b.mp4 shrhub-fleshka.mp4

for f in shrhub-prognozy.mp4 shrhub-fleshka.mp4; do
  echo -n "$f  "; ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"
done
