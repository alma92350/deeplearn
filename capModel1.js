///////////////////////////////
// added FILTER_SIZE
// increased conv weights
// add a fully connected layer at input
// store model variables to local storage
///////////////////////////////
// Network Parameters
///////////////////////////////
///////////////////////////////
num_input = 0;
TRAIN_STEPS = 5000;
LEARNING_RATE = 0.01;
MOMENTUM = 0.01;
DISPLAY = false;
BATCH_SIZE = 10;
var	LABELS_SIZE = 26; // ABCDEFGHKLMNPRTWXYZ234569 & 'none'
var GLOBAL_STEP = 0;
const IMAGE_SIZE = 30;
////////////////////////////////

const optimizer = dl.train.momentum(LEARNING_RATE,MOMENTUM);

// Variables that we want to optimize

const hiddenInputLayerSize = 32;
var fullyConnectedWeights_Input;
var fullyConnectedBias_input;

const FILTER_SIZE=6;
const conv1OutputDepth = 32;
var conv1Weights;

const conv2InputDepth = conv1OutputDepth;
const conv2OutputDepth = 64;
var conv2Weights;

var fullyConnectedWeights;
var fullyConnectedBias;

/////////////////////
function initializeModelVariables(){
	fullyConnectedWeights_Input = dl.variable(
		  	dl.randomNormal(
				    [IMAGE_SIZE*IMAGE_SIZE, hiddenInputLayerSize*hiddenInputLayerSize], 0,
				    1 / Math.sqrt(IMAGE_SIZE*IMAGE_SIZE)));
	fullyConnectedBias_input = dl.variable(dl.zeros([hiddenInputLayerSize*hiddenInputLayerSize]));

	conv1Weights = dl.variable(
		  	dl.randomNormal([FILTER_SIZE, FILTER_SIZE, 1, conv1OutputDepth], 0, 0.1) );

	conv2Weights = dl.variable(
		  	dl.randomNormal([FILTER_SIZE, FILTER_SIZE, conv2InputDepth, conv2OutputDepth], 0, 0.1));

	fullyConnectedWeights = dl.variable(
		  	dl.randomNormal(
				    [8 * 8 * conv2OutputDepth, LABELS_SIZE], 0,
				    1 / Math.sqrt(8 * 8 * conv2OutputDepth)));
	fullyConnectedBias = dl.variable(dl.zeros([LABELS_SIZE]));
}

initializeModelVariables();

const modelName = 'model1';
function saveModelVariablesToLocalStorage(){
	var modelVariables = [fullyConnectedWeights_Input.dataSync(),
												fullyConnectedBias_input.dataSync(),
												conv1Weights.dataSync(),
												conv2Weights.dataSync(),
												fullyConnectedWeights.dataSync(),
												fullyConnectedBias.dataSync()];
	//localStorage[modelName] = modelVariables;
	return modelVariables;
}

function restoreModelVariablesFromLocalStorage(){
	var modelVariables = JSON.parse(localStorage[modelName]);
	var i=0;
	fullyConnectedWeights_Input = dl.variable(dl.tensor(modelVariables[i++],
																[IMAGE_SIZE*IMAGE_SIZE, hiddenInputLayerSize*hiddenInputLayerSize],
																'float32'));
	fullyConnectedBias_input = dl.variable(dl.tensor(modelVariables[i++],
															[hiddenInputLayerSize*hiddenInputLayerSize],
															'float32'));
															
	conv1Weights = dl.variable(dl.tensor(modelVariables[i++],
									[FILTER_SIZE, FILTER_SIZE, 1, conv1OutputDepth],
									'float32'));
	conv2Weights = dl.variable(dl.tensor(modelVariables[i++],
									[FILTER_SIZE, FILTER_SIZE, conv2InputDepth, conv2OutputDepth],
									'float32'));
									
	fullyConnectedWeights = dl.variable(dl.tensor(modelVariables[i++],
													[8 * 8 * conv2OutputDepth, LABELS_SIZE],
													'float32'));
	fullyConnectedBias = dl.variable(dl.tensor(modelVariables[i++],
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
  const fullyConnInputLayer = dl.tidy(() => {
    return xs.as2D(-1, fullyConnectedWeights_Input.shape[0])
      .matMul(fullyConnectedWeights_Input)
      .add(fullyConnectedBias_input).sigmoid();
  });
  
  // Conv 1
  const layer1 = dl.tidy(() => {
    return fullyConnInputLayer.as4D(-1, hiddenInputLayerSize, hiddenInputLayerSize, 1)
    		.conv2d(conv1Weights, 1, 'same')
        .relu()
        .maxPool([2, 2], strides1, pad1);
  });

  // Conv 2
  const layer2 = dl.tidy(() => {
    return layer1.conv2d(conv2Weights, 1, 'same')
        .relu()
        .maxPool([2, 2], strides2, pad2);
  });

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

