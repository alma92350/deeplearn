///////////////////////////////
// added FILTER_SIZE
// increased conv weights
// add a fully connected layer at input
// store model variables to local storage
// removed entry fullly connected layer to lower memory
// save restore GlobalStep
// configurable model
///////////////////////////////
// Network Parameters
///////////////////////////////
///////////////////////////////
TRAIN_STEPS = 5000;
LEARNING_RATE = 0.001;
MOMENTUM = 0.001;

BATCH_SIZE = 10;
var	LABELS_SIZE = 2; // 26; // ABCDEFGHKLMNPRTWXYZ234569 & 'none'
var GLOBAL_STEP = 0;
var IMAGE_SIZE = 30;
var OUT_LAYER_SIZE = 7; // computed or look at the layer 2 shape layer2.print()
////////////////////////////////

const optimizer = dl.train.momentum(LEARNING_RATE,MOMENTUM);

// Variables that we want to optimize

//const hiddenInputLayerSize = 32;
//var fullyConnectedWeights_Input;
//var fullyConnectedBias_input;

var FILTER_SIZE=5;
var conv1OutputDepth = 32;
var conv1Weights;

var conv2InputDepth = conv1OutputDepth;
var conv2OutputDepth = 16;
var conv2Weights;

var fullyConnectedWeights;
var fullyConnectedBias;

var saveMVar = true;// save to localStorage by default. False if store attempt failed once

/////////////////////
// input 30 x 30
// hidden fully conn 16 x 16
// max pool --> 8 x 8
// max pool -->> 4 x 4

function initializeModelVariables(){

	conv1Weights = dl.variable(
		  	dl.randomNormal([FILTER_SIZE, FILTER_SIZE, 1, conv1OutputDepth], 0, 0.1) );
	console.log('conv1: ok: ');
	
	conv2Weights = dl.variable(
		  	dl.randomNormal([FILTER_SIZE, FILTER_SIZE, conv2InputDepth, conv2OutputDepth], 0, 0.1));
	console.log('conv2: ok');
	
	fullyConnectedWeights = dl.variable(
		  	dl.randomNormal(
				    [OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth, LABELS_SIZE], 0,
				    1 / Math.sqrt(OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth)));
	console.log('fully: ok');
	
	fullyConnectedBias = dl.variable(dl.zeros([LABELS_SIZE]));
	console.log('bias: ok');
}

//initializeModelVariables();

/////////////////////////////////////////
//////// getters and setters ////////////
/////////////////////////////////////////
const modelName = 'singleCharModel1';

function initializeModel(param){
	if(param!==undefined){
		GLOBAL_STEP = param.globalStep;
		TRAIN_STEPS = param.trainSteps;
		LEARNING_RATE = param.learningRate;
		MOMENTUM = param.momentum;
		IMAGE_SIZE = param.inputImageSize;
		FILTER_SIZE = param.filterSize;
		conv1OutputDepth = param.conv1OutputDepth;
		conv2InputDepth = conv1OutputDepth;
		conv2OutputDepth = param.conv2OutputDepth;
		OUT_LAYER_SIZE = param.outLayerSize;
		console.log('param: ' + param);
	} else {
		console.log('model initialization param: undefined'); 
	}
	//initializeModelVariables();
}

function getModelParameters(){
	var param = {
		globalStep : GLOBAL_STEP,
		trainSteps : TRAIN_STEPS,
		learningRate : LEARNING_RATE,
		momentum : MOMENTUM,
		inputImageSize : IMAGE_SIZE,
		filterSize : FILTER_SIZE,
		conv1OutputDepth : conv1OutputDepth,
		conv2OutputDepth : conv2OutputDepth,
		outLayerSize : OUT_LAYER_SIZE,
	};
	return param;
}

function getModelVariables(){
	var modelVariables = [Array.from(conv1Weights.dataSync()),
												Array.from(conv2Weights.dataSync()),
												Array.from(fullyConnectedWeights.dataSync()),
												Array.from(fullyConnectedBias.dataSync())];
	return modelVariables;
}

function saveModelVariablesToLocalStorage(){
	localStorage['GLOBAL_STEP'] = GLOBAL_STEP;
	if(saveMVar){
		var modelVariables = getModelVariables();
		try{
				localStorage[modelName] = modelVariables;
		} catch (err) {
				console.log(err);
				saveMVar = false; // not try to save again
			return false;
		}
		return true;
	}
}

function toFloatArray(array){
	
	console.log('array len: '+ array.length);
	var res = new Float32Array(array.map((el)=>{return parseFloat(el);}));
	console.log('res len ' + res.length);
	return res;
}

function restoreModelVariablesFromLocalStorage(){
	GLOBAL_STEP = parseInt(localStorage['GLOBAL_STEP']);

	var modelVariables = localStorage[modelName].split(',');
	var idx=0;
	var len = 0;	
	
	idx = len;
	len += FILTER_SIZE * FILTER_SIZE * conv1OutputDepth;
	conv1Weights = dl.variable(dl.tensor(toFloatArray(modelVariables.slice(idx,len)),
									[FILTER_SIZE, FILTER_SIZE, 1, conv1OutputDepth],
									'float32'));
	
	idx = len;
	len += FILTER_SIZE * FILTER_SIZE * conv2InputDepth * conv2OutputDepth;
	conv2Weights = dl.variable(dl.tensor(toFloatArray(modelVariables.slice(idx,len)),
									[FILTER_SIZE, FILTER_SIZE, conv2InputDepth, conv2OutputDepth],
									'float32'));
									
	idx = len;
	len += OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth * LABELS_SIZE;
	fullyConnectedWeights = dl.variable(dl.tensor(toFloatArray(modelVariables.slice(idx,len)),
													[OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth, LABELS_SIZE],
													'float32'));

	idx = len;
	len += LABELS_SIZE;
	fullyConnectedBias = dl.variable(dl.tensor(toFloatArray(modelVariables.slice(idx,len)),
												[LABELS_SIZE],
												'float32'));
}

function loadModelVariables(data){
	function arrayOf(inp,len){
		var out=[];
		for(var i=0; i<len;i++) 
			out.push(inp[i]);
		return out;
	}
	conv1Weights = dl.variable(dl.tensor(arrayOf(data[0],FILTER_SIZE * FILTER_SIZE * conv1OutputDepth),
									[FILTER_SIZE, FILTER_SIZE, 1, conv1OutputDepth],
									'float32'));
	conv2Weights = dl.variable(dl.tensor(arrayOf(data[1],FILTER_SIZE * FILTER_SIZE * conv2InputDepth * conv2OutputDepth),
									[FILTER_SIZE, FILTER_SIZE, conv2InputDepth, conv2OutputDepth],
									'float32'));
	fullyConnectedWeights = dl.variable(dl.tensor(arrayOf(data[2],OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth * LABELS_SIZE),
													[OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth, LABELS_SIZE],
													'float32'));
	fullyConnectedBias = dl.variable(dl.tensor(arrayOf(data[3],LABELS_SIZE),
												[LABELS_SIZE],
												'float32'));
}
/////////////////////
// Loss function
function loss(labels, ys) {  // : dl.Tensor2D: dl.Tensor2D
  
  //return dl.losses.softmaxCrossEntropy(labels, ys).mean(); // as dl.Scalar;
  return dl.sub(labels, ys).square().mean();
}

/////////////////////
// Our actual model
function model(inputXs) {	//: dl.Tensor2D : dl.Tensor2D
  const xs = inputXs.as4D(-1, IMAGE_SIZE, IMAGE_SIZE, 1);

  const strides1 = 1;
	const strides2 = 2;
  const pad1 = 0;
	const pad2 = 0;

  const layer1 = dl.tidy(() => {
    return xs.conv2d(conv1Weights, 1, 'same')
        .relu()
        .maxPool([2, 2], strides1, pad1);
  });
	
  // Conv 2
  const layer2 = dl.tidy(() => {
    return layer1.conv2d(conv2Weights, 1, 'same')
        .relu()
        .maxPool([3, 3], strides2, pad2);
  });
  //console.log("layer2 ok");
	//console.log(layer2.print());
  // Final layer
  return layer2.as2D(-1, fullyConnectedWeights.shape[0])
      .matMul(fullyConnectedWeights)
      .add(fullyConnectedBias).sigmoid();
}

//////////////////////
// Train the model.
async function train(data, log, done) {
  const returnCost = true;

  for (let i = 0; i < TRAIN_STEPS; i++,GLOBAL_STEP++) {
    const cost = optimizer.minimize(() => {
      const batch = data.nextTrainBatch(BATCH_SIZE);
      return loss(batch.labels, model(batch.xs));
    }, returnCost);

		log(i,`GLOBAL_STEP: ${GLOBAL_STEP}, average loss[${i}]: `, cost.dataSync());
		
    await dl.nextFrame();
  }
  done();
}

/////////////////////////////////////////////////////////
// Predict the digit number from a batch of input images.
function predict(x){	//: dl.Tensor2D : number[] 
  const pred = dl.tidy(() => {
    const axis = 1;
    return model(x).argMax(axis);
  });
  return Array.from(pred.dataSync());
}


/////////////////////////////////////////////////////////////
// Given a logits or label vector, return the class indices.
function classesFromLabel(y){	// : dl.Tensor2D : number[] 
  const axis = 1;
  const pred = y.argMax(axis);

  return Array.from(pred.dataSync());
}

