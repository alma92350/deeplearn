CANVAS_SIZE = 30;
FONT = "22px Arial";
CHAR_X = 9;
CHAR_Y = 22;
LINE_WIDTH = 20;
Angle = 0;

function generate(){
	const canvas = document.getElementById("canvas_ori");
	const ctx = canvas.getContext("2d");
	const inpLabel =  document.getElementById("input_label");
	const label = inpLabel.value;
	console.log(label);
	
	canvas.width = CANVAS_SIZE;
	canvas.height = CANVAS_SIZE;
  
  ctx.fillStyle="black";
  ctx.fillRect(0,0,CANVAS_SIZE,CANVAS_SIZE);
  
  ctx.translate(CANVAS_SIZE/2,CANVAS_SIZE/2);
  ctx.rotate((Angle*5-30)*Math.PI/180);
  ctx.translate(-CANVAS_SIZE/2,-CANVAS_SIZE/2);

	ctx.font = FONT;
	
	Angle = (Angle+1)%12;
	ctx.fillStyle="white";
  ctx.fillText(label,CHAR_X,CHAR_Y);
}


