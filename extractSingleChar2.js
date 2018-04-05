//////////////////////////////
// limit memory leakage related to tensor allocations
// remove unused characters
// Add global step
// increase number of filters in capModel
// Clean up
// use capModel1.js
// if no input tensor then stop before training
// adjust automatically the probability level for low proba selection
// Add reporting to server via websocket
// update stop and pause buttons
// replace console.log with logAndDone
// store wsUri in local storage
// add remote controls
// add a name and keep alive
// Code refactor:
// 	separate the scheduler from the main  logAndDone.log
//	separate the remote control part from the protocol layer
// Better reporting of prediction result
// storage of model variables in localStorage --- EXCEED QUOTA!!!
// capability to address a unique instance
/////////////////////////////////////////////
//
//
// Recognize 1 character at high confidence
//
//
////////////////////////////////////////////
// optimize for 1 character prediction
// wondering if showPredictions should be async
// but issue with scheduler: not waiting for predictions finish
// => async would require more codes to handle wating before next step
// report predictions at each show predictions
// TRAINING STEP multiplier too large for this setting
// set directly the training steps
// reset Training steps after Stop
// new command: clear model variable storage in local storage
// auto save at each step
// report model: under construction
// improve structure of report
// use local report.name
// new next training batch generation process
// made show predictions asynchronous
// modify the log and done to call prediction
// after prediction call next step for scheduler
// save after each training then call predictions
// report the ok/nok predictions for each label
// display only the test samples not the training
// allow subset of original labels
// remove some button events
// synchronize last predictions varalbe to global step
// report predictions on not labeled data
// send automatically data when training done
// add load files command
// return error if saving variables not successful
// fix setmodel: initialize then load variables
// convert datasync results to Array in get model variable function too
// backup feature during training
// revert modification on train backup
// use the training log function to do regular backup
// more info on the model
// do not show predictions after training
// number in prediction batch + catch error
// correct next Training batch: case target length == 0
// use hashes to provide ws Uri and report name
// avoid predict test values again
// only after training
// allow predictions on unlabled only
// 
// add configuration of strides and outlayer in model
////////////////////////////////////////////
// Test on Encoder and Decoder
// !!Disable CORs on Chrome:
// !!> chrome.exe --disable-web-security --user-data-dir
const canvas_ori = document.getElementById('canvas_ori');
const canvas_out = document.getElementById('canvas_out');
var ctx,imageData,data;

var predictionShown = false;
var lastLosses = [];
/////////////////////////
var   Max_files = 1;

const char_width = CANVAS_SIZE;
const char_height = CANVAS_SIZE;
STEP_MULTIPLIER = 20; // TRAIN_STEPS = STEP_MULTIPLIER * TRAINING_BATCH_SIZE
//////////////////////////

var   offset = [0,21,37,53,71];
var	  iDataStack = [];
var	  onClicks=[];

///////////////////////////////////////////////////////
////////// unique labels and Dico /////////////////////

//var   _LABELS =['1','2','3','4','5','6','7','8','9','0',
//				'A','B','C','D','E','F','G','H','I','J',
//				'K','L','M','N','O','P','Q','R','S','T',
//				'U','V','W','X','Y','Z','none'];
				
var   _LABELS =['2','3','4','5','6','9',
				'A','B','C','D','E','F','G','H','K','L',
				'M','N','P','R','T','W','X','Y','Z','none'];
var		LABELS_USED = [];

var		TARGET = 'A';
var		NOT_TARGET = 'nok';
var   TARGET_LABELS;
var 	NUM_PRED; // number of predictions to be displayed
var 	uniqueLabels; 


var labelDict;
var labelRevD = [];

function initialize(labels=_LABELS, target=TARGET){
	//report.init();
	predictionShown = false;
	lastLosses = [];
	lastPredictions={};
	
	LABELS_USED = labels;
	TARGET = target;
	TARGET_LABELS =[TARGET,NOT_TARGET];
	NUM_PRED = Math.min(TARGET_LABELS.length,3);
	uniqueLabels = new Set(TARGET_LABELS.sort());
	
	iDataStack = [];
	onClicks = [];
	num_files = 0;
	
	LABELS_SIZE = 2; // for model
	initializeModelVariables();
	
	logAndDone.log("unique labels: " + uniqueLabels.size);
	logAndDone.log("make dictionary");
	
	labelDict = {
		dico: {},
		add: function(lb,vect){
			labelDict.dico[lb] = vect;
		},
		getVect: function(lb){
			return (lb==TARGET)?labelDict.dico[TARGET]:labelDict.dico[NOT_TARGET];
		},
	};
	var idx=0;
	for(let label of uniqueLabels){
		labelRevD.push(label);
		////////////////////////////////
		const oneHotVector = dl.tidy(() => {
    	return dl.oneHot(dl.tensor1d([idx++]),uniqueLabels.size)
    			.squeeze();
  	});
  	////////////////////////////////
		//labelDict[label] = dl.oneHot(dl.tensor1d([idx++]),uniqueLabels.size).squeeze();
		labelDict.add(label, oneHotVector);
	};
	
	logAndDone.log("generating inputs");
	generate(labels);
	
	logAndDone.log("loading...once");
	load();
	
}

labelRevD.getLabel = function(oneHot){
  return labelRevD[dl.argMax(oneHot).dataSync()[0]];
}

////////////////////////////////////////
var trainingBatch = {
	targetStart: 0,
	targetLength: 0,
};
trainingBatch.nextTrainBatch = function(batchSize){

	var xs = [];
	var lb = [];
	
	// find TARGET segment: start and length
	if(trainingBatch.targetLength==0){
		const vectTarget = labelDict.getVect(TARGET);
		
		for(var i=0; i<trainingBatch.size;i++){
			if(trainingBatch.Array_labels[i]===vectTarget){
				trainingBatch.targetStart = i;
				i=trainingBatch.size;
			}
		}
		for(var i=trainingBatch.targetStart; i<trainingBatch.size;i++){
			if(trainingBatch.Array_labels[i]!==vectTarget){
				trainingBatch.targetLength = i - trainingBatch.targetStart;
				i=trainingBatch.size;
			}
		}
	};
	
	// Select half samples in target segment and half not in target segment
	for(var i=0;i<Math.floor(batchSize/2);i++){
		var idxTarget = Math.floor((Math.random()*trainingBatch.targetLength))+trainingBatch.targetStart;
		idxTarget = trainingBatch.targetLength>0?idxTarget:Math.floor(Math.random()*trainingBatch.size)
		// <-------------size--------------------------------->
		// .......<start----length---->.........
		// <-------start----size-length--><---------length---->
		var idxnt = Math.floor(Math.random()*(trainingBatch.size-trainingBatch.targetLength));
		var idxNotTarget = idxnt<trainingBatch.targetStart?idxnt:idxnt+trainingBatch.targetStart;

		xs.push(trainingBatch.Array_xs[idxTarget]);
		lb.push(trainingBatch.Array_labels[idxTarget]);
		xs.push(trainingBatch.Array_xs[idxNotTarget]);
		lb.push(trainingBatch.Array_labels[idxNotTarget]);
	};

	//logAndDone.log(xs,lb);
	////////////////////////////////
	const xs_stack = dl.tidy(() => {
  	return dl.stack(xs,0);
	});
	const lb_stack = dl.tidy(() => {
		return dl.stack(lb,0);
	});
	////////////////////////////////
	return {
		xs : xs_stack,
		labels: lb_stack
	};
};

///////////////////////////////////////////
var labels = new Set();
function addEventToList(i){
	if(i>=onClicks.length){
		onClicks.push(function(){
		  var label = document.getElementById('input_label');
		  var divlabel = document.getElementById('div_label_'+i);
		  var td1 = document.getElementById('td1_'+i);
		  var lab_count = document.getElementById('lab_count');
		  if(_LABELS.includes(label.value)){
			iDataStack[i].label = label.value;
			td1.setAttribute("style","background-color:powderblue;");
			divlabel.innerHTML = "label: " + label.value;
			labels.add(label.value);
			lab_count.innerHTML = labels.size;
		  }
		});
	};
}

function addEventToCanvas(){
  for(var i=0;i<iDataStack.length;i++){
  	if(iDataStack[i].label=='none'){
			addEventToList(i);
			var canvas = document.getElementById('div_canvas_'+i);
			canvas.addEventListener('click',onClicks[i]);
		}
  }
}

/////////////////////////////////////////////////

function displayStack(){
  // add the canvas
  const div_res = document.getElementById('div_results');
  const Columns = 5;
  const Rows = Math.floor(iDataStack.length / 5) + (iDataStack.length%5) ;

  var table = '<table border="5px"><tbody>';
  var count=0;
  for(var row=0; row<Rows && count<iDataStack.length; row++){
	  var line1="",line2="";
	  for(var i=0; i<Columns && count<iDataStack.length; i++,count++){
	  	if(true){ //iDataStack[count].label!=='none'){ // for filterFocus
				// stacked display format
				line1 += '<td id="td1_'+count+'" align="center" width=100><canvas id="div_canvas_'+count+
								'" width='+char_width+
								' height='+char_height+
								' style="center"></canvas></td>';
						
				line2 += '<td id="td2_'+count+'" align="center"><label id="div_label_'+count+
								'" style="center"> label: '+iDataStack[count].label+
								'</label></td>';
			} else {
				i--; // compensate increase of column
			}
	  };
	  table += '<tr>'+line1+'</tr><tr>'+line2+'</tr>';
  };
  table += '</tbody></table>';
  div_res.innerHTML = table;

  // display in canvas
  
  for(var i=0;i<iDataStack.length;i++){
  	if(true) { // iDataStack[i].label!=='none'){ // for filterFocus
			var canvas = document.getElementById('div_canvas_'+i);
		  var ctx = canvas.getContext('2d');
			ctx.putImageData(iDataStack[i],0,0);
		}
  };
}



function capture(iData){
  // for filterFocus
  inputImageDataStack.push(iData);
  
  for(var offset_index = 0;offset_index<offset.length;offset_index++){
		// Extract characters from canva_out
		var ctxout = canvas_out.getContext('2d');
		var idata = ctxout.getImageData(offset[offset_index],0,char_width, char_height);
		idata.label = "none";
		idata.src = image_ori.src;
		idata.idx = offset_index;
		iDataStack.push(idata);
  };

}

/////////////////////////////////////////////////
var num_files = 0;

var img = new Image();
img.crossOrigin = "Anonymous";

img.onload = function() {
  
  draw(this,canvas_ori);
  draw(this,canvas_out);

    var ctx = canvas_out.getContext('2d');
	var iData;
	try {
		iData = ctx.getImageData(0,0,canvas_out.width, canvas_out.height);
	} catch (err) {
		logAndDone.log(err);
		//iData = ctx.getImageData(0,0,canvas_out.width, canvas_out.height);
	}
	
	var th = 220;
	for(var i = 0; i<iData.data.length;i+=4){
	  if(iData.data[i]>th||iData.data[i+1]>th||iData.data[i+2]>th){
	    iData.data[i] = iData.data[i+1] = iData.data[i+2] = 255;
	  } else {
		iData.data[i] = iData.data[i+1] = iData.data[i+2] = 0;
	  }
    }
    ctx.putImageData(iData, 0, 0);
  
  ////////////////
  // After canvas_out treatment
  capture(iData);
  ////////////////	
 
  if(num_files%Max_files == 0) {
	//num_files = 0;
	// end of loading now display
	displayStack();
	addEventToCanvas();
	//setLabelList(firstLabelList);
	report.send('Total files loaded: ' + num_files);
  } else load();
};

const image_ori = document.getElementById('image_ori');
function load(){
	image_ori.src = 'captchas/captcha' + num_files + '.png';
	img.src = image_ori.src;
	num_files++;
}

function draw(image,canvas) {
  canvas.width = image.width;
  canvas.height = image.height;
  
  var ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  image.style.display = 'none';
};

///////////////////////////////////////
/////////// SCHEDULER /////////////////
///////////////////////////////////////
var Scheduler = {
	RUN_SCHEDULER : false,
	_step : 1,
	_probaLevel : 60,
	run : function(){
					Scheduler.RUN_SCHEDULER = true;
					TRAIN_STEPS = 3000;
					logAndDone.log("scheduler: TRAIN_STEPS: "+TRAIN_STEPS);
					trainModel_OnAll();
				},
	pause : function(){
					// wait until end of phase
					Scheduler.RUN_SCHEDULER = false;
					logAndDone.log("scheduler: pausing...: ");
				},
	resume : function(){
					// wait until end of phase
					Scheduler.RUN_SCHEDULER = true;
					Scheduler.nextStep();
				},
	stop : function(){
					// Stop Now!
					Scheduler.RUN_SCHEDULER = false;
					TRAIN_STEPS = 100;
				},
	nextStep: function(){
					//saveModelVariablesToLocalStorage();
					logAndDone.log("scheduler: Current step: "+Scheduler._step);
					if(Scheduler.RUN_SCHEDULER){
						switch (Scheduler._step){
					
							case 1:
							case 3:
							case 5:
								makeTrainingBatchOfWrongPredictions();
								if(trainingBatch.size>0){
									logAndDone.log("scheduler: Wrong prediction samples: " + trainingBatch.size);
									Scheduler._step+=2;
								} else {
									makeTrainingBatch();
									Scheduler._step = 2; // go to low probability
									logAndDone.log("scheduler: Train All samples: " + trainingBatch.size);
								}
								break;
								
							case 2:
							case 4:
							case 6:
								makeTrainingBatch_OnLowProbability(Scheduler._probaLevel);
								if(trainingBatch.size>0){
									logAndDone.log("scheduler: Low probability samples: " +
																	trainingBatch.size+
																	" Min Proba: " +
																	Scheduler._probaLevel);
									Scheduler._step +=2;
								} else {
									Scheduler._probaLevel = Math.min(Scheduler._probaLevel+5,100);
									logAndDone.log("scheduler: Min Proba increased: " + Scheduler._probaLevel);
									makeTrainingBatch();
									Scheduler._step = 1; // go to wrong predictions
									logAndDone.log("scheduler: Train All samples: " + trainingBatch.size);
								}
								break;
							
							default:
								makeTrainingBatch();
								Scheduler._step = 1;
								break;
						};
						TRAIN_STEPS = 3000;
						logAndDone.log("scheduler: TRAIN_STEPS: "+TRAIN_STEPS);
						train(trainingBatch,trainingLog,trainingDone);
					} else {
						logAndDone.log("scheduler: GLOBAL_STEP: "+GLOBAL_STEP);
					}
					
				}
}

////////////////////////////////////////
//////////// Log and report ////////////
////////////////////////////////////////

var logAndDone = {
	talk : true,
	log : function(message){
		if(logAndDone.talk){
			console.log(message);
			try {
				report.send(message);
			} catch (err) {
				//console.log(err);
				//report.init();
			}
		}
	}
};

function trainingDone(){
	if(saveModelVariablesToLocalStorage())
		logAndDone.log("Training done & Model variable saved!");
	else
		logAndDone.log("Training done. Error: while saving variables!");
	
	predictionShown = false;
	report.processCommand2('getmodel');
};

function trainingLog(step,message){
	logAndDone.log('GLOBAL_STEP: ' + GLOBAL_STEP + ': loss: ' + message);
	if(step%1000==0)
		lastLosses.push(parseFloat(message));
	
	if(step%10000==0){
		//report.processCommand2('predict');
		report.processCommand2('getmodel');
		lastLosses = []; // clear after report
	}
}

///////////////////////////////////////
/// utility function
function makeTensorFromPixels(idata){
	const x_tensor = dl.tidy(() => {
		return dl.cast(dl.fromPixels(idata).slice([0,0,0],[idata.height,idata.width,1]).squeeze(),"float32").div(dl.scalar(255.0,"float32"));
	});
	
	return x_tensor;
}

///////////////////////////////////////
function makeTrainingBatch_OnLowProbability(labelValue){
	logAndDone.log("List low probabilities");
	
	var xs=[],labels=[];
	try{
		for(var i=0;i<iDataStack.length;i++){
			var data = iDataStack[i];
			if((data.label !== 'none') && (data.predictions[0].probability<labelValue)){
				xs.push(makeTensorFromPixels(data));
				labels.push(labelDict.getVect(data.label));
			}
		}
		logAndDone.log("Save the training tensors to training Batch " + xs.length);
	} catch (err) {
		logAndDone.log("Error while preparing 'low probability prediction' batch"+err);
	}
		
	trainingBatch.Array_xs = xs;
	trainingBatch.Array_labels = labels;
	trainingBatch.size = xs.length;
	
	return xs.length;
}

function trainModel_OnLowProbability(){
	logAndDone.log("make training batch if low probability");
	var labelValue = parseInt(document.getElementById('input_label').value);

  if(makeTrainingBatch_OnLowProbability(labelValue)<1){
  	logAndDone.log("Provide a higher probability!");
  	return;
  }
  logAndDone.log("train the model for " + TRAIN_STEPS + " steps");
	train(trainingBatch,trainingLog,trainingDone);
}

////////////////////////////////////////
function makeTrainingBatchOfWrongPredictions(){
  logAndDone.log("List wrong predictions");
  var xs=[],labels=[];

	try{
		for(var i=0;i<iDataStack.length;i++){
			var data = iDataStack[i];

			if((data.label !== 'none') && ((data.label==TARGET?TARGET:NOT_TARGET) != data.predictions[0].prediction)){
				xs.push(makeTensorFromPixels(data));
				labels.push(labelDict.getVect(data.label));
			}
		}
		logAndDone.log("Save the training tensors to training Batch " + xs.length);
		trainingBatch.Array_xs = xs;
		trainingBatch.Array_labels = labels;
		trainingBatch.size = xs.length;
	} catch (err) {
		logAndDone.log("Error while preparing 'wrong prediction' batch"+err);
	}
	return xs.length;
};

function trainModel_OnWrongPredictions(){
	logAndDone.log("make training batch if wrong prediction");
  if(makeTrainingBatchOfWrongPredictions()<1){
  	logAndDone.log("no wrong predictions");
  	return;
  }

  logAndDone.log("train the model for " + TRAIN_STEPS + " steps");
	train(trainingBatch,trainingLog,trainingDone);
}
///////////////////////////
function makeTrainingBatch(){
  logAndDone.log("Make tensors from labeled image data");
  var xs=[],labels=[];

	for(var i=0;i<iDataStack.length;i++){
		var data = iDataStack[i];

		if(data.label !== 'none'){
			xs.push(makeTensorFromPixels(data));
			labels.push(labelDict.getVect(data.label));
		}
	}
	logAndDone.log("Save the training tensors to training Batch " + xs.length);
	trainingBatch.Array_xs = xs;
	trainingBatch.Array_labels = labels;
	trainingBatch.size = xs.length;
}

////////////////////////////////////
function trainModel_OnAll(){
  logAndDone.log("make training batch");
  makeTrainingBatch();

  logAndDone.log("train the model for " + TRAIN_STEPS + " steps");
  train(trainingBatch,trainingLog,trainingDone);
}


function makeBatch(select=undefined,from=0,num=100){
  var xs=[],labels=[];
	if(select==undefined){
		select = function(label){return (label=='none');};
		logAndDone.log("select function");
	};
	
	for(var i=from;i<(from+num);i++){
		var data = iDataStack[i];
		if (select(data.label) && i<(from+num)){
			xs.push(makeTensorFromPixels(data));
			labels.push(labelDict.getVect(data.label));
		}
	}
  //logAndDone.log("stack the training tensors");
	////////////////////////////////
	const xs_stack = dl.tidy(() => {
  	return dl.stack(xs,0);
	});
	const lb_stack = dl.tidy(() => {
		return dl.stack(labels,0);
	});
	////////////////////////////////
	return {
		xs : xs_stack,
		labels: lb_stack,
		size : xs.length
	};
}

function makePredictionsByBatch(from,num){
	// create the prediction batch
	const p = makeBatch(()=>{return true;}, from, num);
	
	const probaResults = Array.from(model(p.xs).dataSync());
	//logAndDone.log("Prediction batch size: " + num);
	
	var   predictionProba = [];
	// a helper function to get n highest probabilities descending
	// the index is the forcasted character wrt labelRevD
	function getIndicesOfHighest(array,n=1){
		var res=[];
		const sorted=array.slice().sort().reverse(); // sort on slice prevent change the original array
		for(var i=0;i<n;i++)
			res.push(array.indexOf(sorted[i]));
		return res;
	}
	// extract the probabilities for each prediction
	for(var i=0;i<num;i++){
		predictionProba.push(probaResults.slice(i*(TARGET_LABELS.length),(i+1)*(TARGET_LABELS.length)));
	}
	//logAndDone.log("extracting prediction probabilities");
	
	//logAndDone.log("prediction index: ", getIndicesOfHighest(predictionProba[0],NUM_PRED));
	
	for(var i=0; i<num;i++){
		//iDataStack[i].prediction = labelRevD[predictions[i]];
		const pps = getIndicesOfHighest(predictionProba[i],NUM_PRED);
		
		iDataStack[from+i].predictions = pps.map((idx) => {return {
															prediction:labelRevD[idx],
															probability:Math.floor(predictionProba[i][idx]*100)
														};});
	}
}

async function makePredictions(from, whenDone){
	var maxNum = 10;
	for(from;from<iDataStack.length;from +=maxNum){
		try {
			makePredictionsByBatch(from,Math.min(maxNum,iDataStack.length-from));
			if(from%(50*maxNum)==0)
				report.send("500 predictions...");
			await dl.nextFrame();
		} catch(err){
			report.send("Error: could not perform predictions" + err);
		}
		
	}
	
	whenDone();
}

function drawPredictions(from){
	// show predictions from iDataStack
	for(var i=from; i<iDataStack.length;i++){
		if(iDataStack[i].label=='none'){
			var divlab = document.getElementById("div_label_"+i);
		
			var predprob = iDataStack[i].predictions.map((p) => {
				var pp='<tr>';
				pp += '<td>' + p.prediction + ':</td><td> ' + p.probability + '% </td>';
				pp += '</tr>';
				return pp;
				});
		
			divlab.innerHTML = '<table><tbody>' + predprob.join(' ') + '</tbody></table>';
		}
	}
	logAndDone.log("predictions shown! from: " + from);
	if(from==0)
		predictionShown = true;
}

function showPredictions(whenDone){
	logAndDone.log("make predictions on all samples");
	
	var from = 0;
	
	// skip labeled samples if already verified
	if(predictionShown)
		for(from;(from<iDataStack.length)&&(iDataStack[from].label!=='none');from++){
		};
			
	console.log('predictions from index: ' + from);
	
	makePredictions(from,()=>{
		drawPredictions(0);
		
		reportPredictions();
		whenDone();
	});
}

function predictUnlabeledSamples(whenDone){
	logAndDone.log("make predictions on unlabeled samples");
	
	var from = 0;
	// skip labeled samples if already verified
	for(from;(from<iDataStack.length)&&(iDataStack[from].label!=='none');from++){
	};

	console.log('predictions from index: ' + from);
	
	makePredictions(from,()=>{
		drawPredictions(from);
		
		reportUnlabeledPredictions();
		whenDone();
	});
}

var lastPredictions={};


function reportPredictions(){
	var goodPredictions=0;
	var lessThan50pc=0;
	var lessThan90pc=0;
	var totalSamples=0;
	var set = new Set();
	var results = {};
	
	for(i=0;i<iDataStack.length;i++){
		var lb = iDataStack[i].label;
		if(lb!='none'){
			
			if(!set.has(lb)){
				set.add(lb);
				results[lb]={
								ok : 0,
								nok: 0,
								proba_ok: 0,
								proba_nok: 0
							};
			}
			totalSamples++;
			if((lb==TARGET?TARGET:NOT_TARGET)==iDataStack[i].predictions[0].prediction){
				goodPredictions++;
				lessThan50pc += (iDataStack[i].predictions[0].probability<50)?1:0;
				lessThan90pc += (iDataStack[i].predictions[0].probability<90)?1:0;
				results[lb].ok++;
				results[lb].proba_ok += iDataStack[i].predictions[0].probability;
			} else {
				results[lb].nok++;
				results[lb].proba_nok += iDataStack[i].predictions[0].probability;
			}
		}
	};
	logAndDone.log("Prediction report: Total samples    : "+ totalSamples);
	logAndDone.log("Prediction report: Good predictions : "+ goodPredictions);
	logAndDone.log("Prediction report: Probability < 50%: "+ lessThan50pc);
	logAndDone.log("Prediction report: Probability < 90%: "+ lessThan90pc);
	
	var divPred = document.getElementById("div_predictions");
	var in_divPred="<br><h2>Prediction results</h2>";
	for(let lb of set){
		var lbok = ": OK: "+results[lb].ok+"@"+(results[lb].ok!==0?Math.floor(results[lb].proba_ok/results[lb].ok):0);
		var lbnok= "%, NOK: "+results[lb].nok+"@"+(results[lb].nok!==0?Math.floor(results[lb].proba_nok/results[lb].nok):0)+"%"
		logAndDone.log(lb + lbok + lbnok);
		in_divPred += "<p>"+ lb + lbok + lbnok +"</p>";
	}
	
	divPred.innerHTML = in_divPred;
	
	//////// keep last predictions //////////
	var unlabeled = [];
	for(i=0;i<iDataStack.length;i++){
		var lb = iDataStack[i].label;
		if(lb==='none'){
			unlabeled.push(
				{
					src: iDataStack[i].src,
					idx: iDataStack[i].idx,
					pred:iDataStack[i].predictions[0].prediction,
					proba:iDataStack[i].predictions[0].probability,
				}
			);
		}
	}
	lastPredictions = {
							globalStep : GLOBAL_STEP,
							trainSteps : TRAIN_STEPS,
							target: TARGET,
							labelsUsed: LABELS_USED,
							totalSamples : totalSamples,
							goodPredictions: goodPredictions,
							lessThan50pc: lessThan50pc,
							lessThan90pc: lessThan90pc,
							in_divPred: in_divPred,
							unlabeled: unlabeled,
						};
}

function reportUnlabeledPredictions(){
	var unlabeled = [];
	for(i=0;i<iDataStack.length;i++){
		var lb = iDataStack[i].label;
		if(lb==='none'){
			unlabeled.push(
				{
					src: iDataStack[i].src,
					idx: iDataStack[i].idx,
					pred:iDataStack[i].predictions[0].prediction,
					proba:iDataStack[i].predictions[0].probability,
				}
			);
		}
	}
	if(lastPredictions.globalStep==undefined){
		lastPredictions = {
								globalStep : GLOBAL_STEP,
								trainSteps : TRAIN_STEPS,
								target: TARGET,
								labelsUsed: LABELS_USED,
								totalSamples : "",
								goodPredictions: "",
								lessThan50pc: "",
								lessThan90pc: "",
								in_divPred: "",
								unlabeled : unlabeled,
							};
	} else
		lastPredictions.unlabeled = unlabeled;
}
/////////////////////////////////////////////////////////////////////



function getInputPix1d(canvas){
  var ctx = canvas.getContext('2d');
  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const res = dl.tidy(() => {
  	return dl.fromPixels(imageData).slice([0,0,0],[canvas.height,canvas.width,1]).squeeze();
	});
  return res;
}

/////////////////////////
function generate(labels=_LABELS){
	// get context for char batch generation	
	for(i=0;i<labels.length-1;i++){
		const canvas = document.getElementById("canvas_ori");
		const ctx = canvas.getContext("2d");
		canvas.width = CANVAS_SIZE;
		canvas.height = CANVAS_SIZE;
		
		iDataStack = iDataStack.concat(makeLabelBatch(labels[i].toUpperCase(),ctx));
	};
	displayStack();
	logAndDone.log("Training labeled data generated.");
}
/////////////////////////
////// Commands /////////
/////////////////////////
const CommandNames = [
	'setparam',
	're-init',
	'load',
	'run',
	'pause',
	'next',
	'resume',
	'stop',
	'steps',
	'train',
	'accuracy',
	'predict',
	'proba',
	'wrong',
	'init var',
	'save',
	'restore',
	'clear',
	'getmodel',
	'setmodel',
	'reload',
	'hi',
	'talk',
	'quiet',
	'help',
	'getcmds',
];

var rxBuffer=null;

const processCommands = [
	function(data){
		///// set model parameters (and initialize variables)
		try{
			console.log('setparam function: ' + data);
			initializeModel(data.modelParam);
			report.send('Model parameters initialized');
			initialize(data.labelsUsed,data.target);
			report.send("Labels and Target initialized");
		} catch(err){
			report.send('Error: Model parameters could not be initialized:' + err);
		}
	},
	function(data){
		var labels = data.split(',');
		if(!labels.includes('none')) labels.push('none');
		logAndDone.log(labels);
		initialize(labels);
	},
	function(){
		load();
	},
	Scheduler.run,
	Scheduler.pause,
	Scheduler.next,
	Scheduler.resume,
	Scheduler.stop,
	function(data){
		TRAIN_STEPS = parseInt(data);
		report.send("TRAIN_STEPS: "+TRAIN_STEPS);
	},
	function(){
		try{
			trainModel_OnAll();
		} catch(err){
			report.send("Error during training on all: " + err);
		}
	},
	function(){
		showPredictions(()=>{logAndDone.log("Accuracy done!")});
	},
	function(){
		predictUnlabeledSamples(()=>{
									var data = {
										name: report.name,
										target: TARGET,
										labelsUsed: LABELS_USED,
										data: getModelVariables(),
										modelParam: getModelParameters(),
										lastPredictions: lastPredictions,
										lastLosses: lastLosses,
									};
									report.send("last unlabeled predictions", data);
								});
	},
	function(){
		trainModel_OnLowProbability();
	},
	function(){
		trainModel_OnWrongPredictions();
	},
	function(){
		try{
			initializeModelVariables();
			report.send('Model variable initialized');
		} catch(err){
			report.send('Error: Model variables could not be initialized:' + err);
		}
	},
	function(){
		if(saveModelVariablesToLocalStorage())
			report.send('Model variables saved @GLOBAL_STEP: ' + GLOBAL_STEP);
		else
			report.send('Error: while saving variables @GLOBAL_STEP: ' + GLOBAL_STEP);
	},
	function(){
		restoreModelVariablesFromLocalStorage();
		report.send('Model variables restored @GLOBAL_STEP: ' + GLOBAL_STEP);
	},
	function(){
		localStorage[modelName]='';
		localStorage['GLOBAL_STEP']='';
		report.send('Model storage cleared!');
	},
	////// get model variables ///////
	function(){
		var data = {
						name: report.name,
						target: TARGET,
						labelsUsed: LABELS_USED,
						data: getModelVariables(),
						modelParam: getModelParameters(),
						lastPredictions: lastPredictions,
						lastLosses: lastLosses,
					};
		report.send("modelVar",data);
	},
	////// set model variables
	function(data){
		// load model variables
		try{
			console.log('setparam function: ' + data);
			initializeModel(data.modelParam);
			report.send('Model parameters initialized');
			initialize(data.labelsUsed,data.target);
			report.send("Labels and Target initialized");
			loadModelVariables(data.data);
			report.send("Model Variables loaded");
		} catch (err) {
			console.log(err);
			report.send("Error: model Variables not Set");
			//report.send(err.TypeError.message);
			return;
		}		
	},
	function(){
		location.reload();
	},
	function(){
		report.send('hello!');
	},
	function(){
		logAndDone.talk = true;
	},
	function(){
		logAndDone.talk = false;
	},
	function(){
		report.send('Supported Commands: ' + CommandNames);
	},
	function(){
		report.send('commands',CommandNames);
	},
];

/////////////////////////
///// reporting /////////
/////////////////////////
var report = {
	name : localStorage['reportName']!==undefined?localStorage['reportName']:Math.floor(Math.random()*1000),
	ws : null,
  processCommand2: function(cmd,data){
				try {
					processCommands[CommandNames.indexOf(cmd)](data);
				} catch (err) {
					console.log(err);
					report.send('Error: command "'+cmd+'" cannot be processed!');
				}
			},
	
	init : function(){
				// wsUri = "wss://example.com/ws/websoket";
				var wsUri = document.getElementById('webSocket').value;
				var wsUriLocalStore = localStorage['wsUri'];
				
				var hashes = window.location.hash.substr(1).split('#');
				var wsUri = hashes[0]===undefined?document.getElementById('webSocket').value:"wss://" + hashes[0];
				
				report.name = hashes[1]===undefined?report.name:hashes[1];
				localStorage['reportName'] = report.name;
				
				if(wsUri==="" && wsUriLocalStore===undefined) {
					console.log("report not initialized!!");
					return;
				}
				
				if(wsUri==""){
					document.getElementById('webSocket').value = wsUriLocalStore;
					wsUri = wsUriLocalStore;
				} else {
					localStorage['wsUri'] = wsUri;
				}
				report.ws = new WebSocket(wsUri);
				
				report.ws.onopen = function(ev) {
					logAndDone.log('[Connected]');
					//////////////////////////
					///// Initialize /////////
					//////////////////////////
					initialize();
				}

				report.ws.onclose = function(ev) {
					logAndDone.log('[Disconnected]');
				}
				///////////////////////////////////////
				//////// remote control ///////////////
				///////////////////////////////////////
				report.ws.onmessage = function(ev) {
					var payload = JSON.parse(ev.data);
					console.log("["+payload.user+"]: "+payload.message);
					/////// keep alive //////
					clearTimeout(report.timer);
					report.timer = setTimeout(()=>{report.send("coucou!");}, 30000);
					if(payload.message==='coucou!') return;
					
					if(payload.user=='firefox' || payload.user==('firefox.'+report.name)){
						report.processCommand2(payload.message.toLowerCase(),payload.data);
					}
				}
			},
	timer : null,
	send : function(message,data=null){
				var payload = {
					message: message,
					user: report.name,
					data: data,
				};
				rxBuffer = payload;
				/////// keep alive //////
				clearTimeout(report.timer);
				report.timer = setTimeout(()=>{report.send("coucou!");}, 30000);
				report.ws.send(JSON.stringify(payload));
			},
}
report.init();
/////////////////////////////////
//// Complex button click ///////
/////////////////////////////////
var predictbtn = document.getElementById("predictbtn");
predictbtn.addEventListener('click', ()=>{showPredictions(()=>{logAndDone.log("predictions done!");});});
var trainbtn1 = document.getElementById("trainbtn1");
trainbtn1.addEventListener('click', ()=>{Scheduler.pause(); trainModel_OnAll();});
var trainbtn2 = document.getElementById("trainbtn2");
trainbtn2.addEventListener('click', ()=>{Scheduler.pause(); trainModel_OnWrongPredictions();});
var trainbtn3 = document.getElementById("trainbtn3");
trainbtn3.addEventListener('click', ()=>{Scheduler.pause(); trainModel_OnLowProbability()});
/////////////////////////


