///////////////////////////////
// Network Parameters
num_hidden_1 = 100; //# 1st layer num features
num_hidden_2 = 200; //# 2nd layer num features (the latent dim)
num_input = 0;
TRAIN_STEPS = 5000;
LEARNING_RATE = 0.01;
MOMENTUM = 0.01;
DISPLAY = false;
BATCH_SIZE = 10;
var	  LABELS_SIZE = 37; // 0..9 & a...z & 'none'
////////////////////////////////

const optimizer = dl.train.momentum(LEARNING_RATE,MOMENTUM);

// Variables that we want to optimize
const conv1OutputDepth = 16;
var conv1Weights = dl.variable(
    	dl.randomNormal([5, 5, 1, conv1OutputDepth], 0, 0.1) );

const conv2InputDepth = conv1OutputDepth;
const conv2OutputDepth = 32;
var conv2Weights = dl.variable(
    	dl.randomNormal([5, 5, conv2InputDepth, conv2OutputDepth], 0, 0.1));

var fullyConnectedWeights = dl.variable(
    	dl.randomNormal(
		      [5 * 5 * conv2OutputDepth, LABELS_SIZE], 0,
		      1 / Math.sqrt(5 * 5 * conv2OutputDepth)));
var fullyConnectedBias = dl.variable(dl.zeros([LABELS_SIZE]));

/////////////////////
// Reset variables
function resetVariables(){
	conv1Weights = dl.variable(
    	dl.randomNormal([5, 5, 1, conv1OutputDepth], 0, 0.1) );

	conv2Weights = dl.variable(
    	dl.randomNormal([5, 5, conv2InputDepth, conv2OutputDepth], 0, 0.1));

	fullyConnectedWeights = dl.variable(
    	dl.randomNormal(
		      [5 * 5 * conv2OutputDepth, LABELS_SIZE], 0,
		      1 / Math.sqrt(5 * 5 * conv2OutputDepth)));
	fullyConnectedBias = dl.variable(dl.zeros([LABELS_SIZE]));
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
	const strides2 = 3;
  const pad1 = 0;
	const pad2 = 0;

  // Conv 1
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
    const cost = optimizer.minimize(() => {
      const batch = data.nextTrainBatch(BATCH_SIZE);
      return loss(batch.labels, model(batch.xs));
    }, returnCost);

    if(i%50==0)
			log(`loss[${i}]: ${cost.dataSync()}`);

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

