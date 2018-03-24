///////////////////////////////
// added FILTER_SIZE
// increased conv weights
// add a fully connected layer at input
// store model variables to local storage
// removed entry fullly connected layer to lower memory
// save restore GlobalStep
///////////////////////////////
// Network Parameters
///////////////////////////////
///////////////////////////////
num_input = 0;
TRAIN_STEPS = 5000;
LEARNING_RATE = 0.001;
MOMENTUM = 0.001;
DISPLAY = false;
BATCH_SIZE = 10;
var	LABELS_SIZE = 2; // 26; // ABCDEFGHKLMNPRTWXYZ234569 & 'none'
var GLOBAL_STEP = 0;
const IMAGE_SIZE = 30;
const OUT_LAYER_SIZE = 7; // computed or look at the layer 2 shape layer2.print()
////////////////////////////////

const optimizer = dl.train.momentum(LEARNING_RATE,MOMENTUM);

// Variables that we want to optimize

//const hiddenInputLayerSize = 32;
//var fullyConnectedWeights_Input;
//var fullyConnectedBias_input;

const FILTER_SIZE=5;
const conv1OutputDepth = 15;
var conv1Weights;

const conv2InputDepth = conv1OutputDepth;
const conv2OutputDepth = 30;
var conv2Weights;

var fullyConnectedWeights;
var fullyConnectedBias;

/////////////////////
// input 30 x 30
// hidden fully conn 16 x 16
// max pool --> 8 x 8
// max pool -->> 4 x 4
function initializeModelVariables(){
//	fullyConnectedWeights_Input = dl.variable(
//		  	dl.randomNormal(
//				    [IMAGE_SIZE*IMAGE_SIZE, hiddenInputLayerSize*hiddenInputLayerSize], 0,
//				    1 / Math.sqrt(IMAGE_SIZE*IMAGE_SIZE)));
//	fullyConnectedBias_input = dl.variable(dl.zeros([hiddenInputLayerSize*hiddenInputLayerSize]));

	conv1Weights = dl.variable(
		  	dl.randomNormal([FILTER_SIZE, FILTER_SIZE, 1, conv1OutputDepth], 0, 0.1) );

	conv2Weights = dl.variable(
		  	dl.randomNormal([FILTER_SIZE, FILTER_SIZE, conv2InputDepth, conv2OutputDepth], 0, 0.1));

	fullyConnectedWeights = dl.variable(
		  	dl.randomNormal(
				    [OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth, LABELS_SIZE], 0,
				    1 / Math.sqrt(OUT_LAYER_SIZE * OUT_LAYER_SIZE * conv2OutputDepth)));
	fullyConnectedBias = dl.variable(dl.zeros([LABELS_SIZE]));
}

//initializeModelVariables();

const modelName = 'singleCharModel1';
function saveModelVariablesToLocalStorage(){
	localStorage['GLOBAL_STEP'] = GLOBAL_STEP;
	var modelVariables = [//fullyConnectedWeights_Input.dataSync(),
												//fullyConnectedBias_input.dataSync(),
												conv1Weights.dataSync(),
												conv2Weights.dataSync(),
												fullyConnectedWeights.dataSync(),
												fullyConnectedBias.dataSync()];
	localStorage[modelName] = modelVariables;
	return modelVariables;
}

function toFloatArray(array){
	
	console.log('array len: '+ array.length);
	var res = new Float32Array(array.map((el)=>{return parseFloat(el);}));
	console.log('res len ' + res.length);
	return res;
}

function restoreModelVariablesFromLocalStorage(){
	GLOBAL_STEP = localStorage['GLOBAL_STEP'];
	var modelVariables = localStorage[modelName].split(',');
	var idx=0;
	var len = 0; //IMAGE_SIZE * IMAGE_SIZE * hiddenInputLayerSize * hiddenInputLayerSize;
		
	//fullyConnectedWeights_Input = dl.variable(dl.tensor(toFloatArray(modelVariables.slice(idx,len)),
	//															[IMAGE_SIZE*IMAGE_SIZE, hiddenInputLayerSize*hiddenInputLayerSize],
	//															'float32'));
//	return fullyConnectedWeights_Input;
//}
//function foo(){
//  var idx, len;
//	return idx+len;
	
							
//	idx = len;
//	len += hiddenInputLayerSize*hiddenInputLayerSize;
//	fullyConnectedBias_input = dl.variable(dl.tensor(toFloatArray(modelVariables.slice(idx,len)),
//															[hiddenInputLayerSize*hiddenInputLayerSize],
//															'float32'));	
	
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

  const strides1 = 2;
	const strides2 = 2;
  const pad1 = 0;
	const pad2 = 0;
	
  // Input Fully connected 1
  //const fullyConnInputLayer = dl.tidy(() => {
  //  return xs.as2D(-1, fullyConnectedWeights_Input.shape[0])
  //    .matMul(fullyConnectedWeights_Input)
  //    .add(fullyConnectedBias_input).sigmoid();
  //});
  
  // Conv 1 //.as4D(-1, IMAGE_SIZE, IMAGE_SIZE, 1)
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
async function train(data, log) {
  const returnCost = true;

  for (let i = 0; i < TRAIN_STEPS; i++) {
  	GLOBAL_STEP++;
    const cost = optimizer.minimize(() => {
      const batch = data.nextTrainBatch(BATCH_SIZE);
      return loss(batch.labels, model(batch.xs));
    }, returnCost);

    if(i%100==0)
			log(`GLOBAL_STEP: ${GLOBAL_STEP}, loss[${i}]: ${cost.dataSync()}`);

    await dl.nextFrame();
  }
  log("Training done!");
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

