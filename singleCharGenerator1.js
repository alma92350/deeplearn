CANVAS_SIZE = 30;
FONT = "22px Arial";
CHAR_X = 9;
CHAR_Y = 22;
LINE_WIDTH = 20;

ANGLE_AMP = 91;
ANGLE_STEP = 45;
Angle = 0;


function generateSample(){
	const canvas = document.getElementById("canvas_ori");
	const ctx = canvas.getContext("2d");
	canvas.width = CANVAS_SIZE;
	canvas.height = CANVAS_SIZE;
		
	const inpLabel =  document.getElementById("input_label");
	const label = inpLabel.value;
	drawLabelAtAngle(label,CHAR_X,CHAR_Y,(Angle*ANGLE_STEP-(ANGLE_AMP/2)),ctx);
	Angle = (Angle+1)%(ANGLE_AMP/ANGLE_STEP);
}

function drawLabel(label,x,y,ctx){

  ctx.fillStyle="black";
  ctx.fillRect(0,0,CANVAS_SIZE,CANVAS_SIZE);
  
	ctx.font = FONT;
	
	ctx.fillStyle="white";
  ctx.fillText(label,x,y);
}

function rotateCanvasByAngle(angle,ctx){

  ctx.fillStyle="black";
  ctx.fillRect(0,0,CANVAS_SIZE,CANVAS_SIZE);

  ctx.translate(CANVAS_SIZE/2,CANVAS_SIZE/2);
  ctx.rotate(angle*Math.PI/180);
  ctx.translate(-CANVAS_SIZE/2,-CANVAS_SIZE/2);
}

function makeLabelBatch(label,ctx){
	var imageDatas=[];
	var idata;
	// first time set the initial rotation angle
	rotateCanvasByAngle(-(ANGLE_AMP/2),ctx);
	
	// then set the step increase only!
	for(var a=0;a<(ANGLE_AMP/ANGLE_STEP);a++){
		for(var x=0;x<10;x++){
			for(var y=0;y<10;y++){
				drawLabel(label,CHAR_X+x-5,CHAR_Y+y-5,ctx);
				idata = ctx.getImageData(0,0,CANVAS_SIZE,CANVAS_SIZE);
				idata.label = label;
				imageDatas.push(idata);
			};
		};
		// finally rotate by angle step
		rotateCanvasByAngle(ANGLE_STEP,ctx);
	}
	return imageDatas;
}

