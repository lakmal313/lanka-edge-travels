new p5(p => {
    let t = 0;
    p.setup = () => p.createCanvas(160,160);
    p.draw = () => {
      p.clear();
      p.noStroke();
      p.fill(255,255,255,120);
      p.ellipse(80 + 30*Math.sin(t), 80 + 30*Math.cos(t), 15 + 4*Math.sin(2*t));
      t += 0.04;
    };
  }, 'p5-container');
  