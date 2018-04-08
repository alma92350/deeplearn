CANVAS_SIZE = 21;
FONT = "22px Arial";
CHAR_X = 2; //9;
CHAR_Y = 18; //22;
LINE_WIDTH = 20;

ANGLE_AMP = 71;
ANGLE_STEP = 35;
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

function computeMargins(ctx){
	var top=0,bottom=0,left=0,right=0;
	var inc_top=1,inc_bottom=1,inc_left=1,inc_right=1;
	var idata = ctx.getImageData(0,0,CANVAS_SIZE,CANVAS_SIZE);
	var count_h=0,count_v=0;
	var topLine=0,bottomLine=0,leftLine=0,rightLine=0;
	
	// compute top and bottom margins
	for(var i=0; i<CANVAS_SIZE/2;i++){
		for(var j=0;j<CANVAS_SIZE;j++){
			topLine += idata.data[count_h];
			bottomLine += idata.data[CANVAS_SIZE*CANVAS_SIZE*4-4-count_h];
			count_h+=4;
		};
		// reset increment when data detected
		inc_top = topLine==0?inc_top:0;
		inc_bottom = bottomLine==0?inc_bottom:0;
		top += inc_top;
		bottom += inc_bottom;
	}
	
	// compute left and right margins
	for(var i=0; i<CANVAS_SIZE/2;i++){
		for(var j=0;j<CANVAS_SIZE;j++){
			leftLine += idata.data[count_v+i*4];
			rightLine += idata.data[CANVAS_SIZE*CANVAS_SIZE*4-4-count_v-i*4];
			count_v+=4*CANVAS_SIZE;
		};
		count_v=0;		
		inc_left = leftLine==0?inc_left:0;
		inc_right = rightLine==0?inc_right:0;
		left += inc_left;
		right += inc_right;
	}
	
	var change_to_y = -parseInt(Math.abs(top-bottom)<2?0:((top-bottom)/2));
	var change_to_x = -parseInt(Math.abs(left-right)<2?0:((left-right)/2));
	
	return {change_to_x,change_to_y};
}

function drawLabel(label,x,y,ctx){

  ctx.fillStyle="black";
  ctx.fillRect(0,0,CANVAS_SIZE,CANVAS_SIZE);
  
	ctx.font = FONT;
	
	ctx.fillStyle="white";
  ctx.fillText(label,x,y);
  var margins = computeMargins(ctx);
  //console.log(label,margins);
  
  ctx.fillStyle="black";
  ctx.fillRect(0,0,CANVAS_SIZE,CANVAS_SIZE);
  
	//ctx.font = FONT;
	
	ctx.fillStyle="white";
  ctx.fillText(label,x+margins.change_to_x,y+margins.change_to_y);
	
  //console.log(label,computeMargins(ctx));
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
	// modified for filterFocus
	for(var a=0;a<(ANGLE_AMP/ANGLE_STEP);a++){
		//for(var x=0;x<10;x++){
		//	for(var y=0;y<10;y++){
				//drawLabel(label,CHAR_X+x-5,CHAR_Y+y-5,ctx);
				drawLabel(label,CHAR_X,CHAR_Y,ctx);
				idata = ctx.getImageData(0,0,CANVAS_SIZE,CANVAS_SIZE);
				idata.label = label;
				imageDatas.push(idata);
		//	};
		//};
		// finally rotate by angle step
		rotateCanvasByAngle(ANGLE_STEP,ctx);
	}
	return imageDatas;
}

