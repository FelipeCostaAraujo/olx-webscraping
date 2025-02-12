import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';

interface DataPoint {
  features: number[];
  target: number;
}

const dataset: DataPoint[] = JSON.parse(fs.readFileSync('artifacts/data/dataset.json', 'utf8'));

function prepareData(data: DataPoint[]) {
  const featureValues = data.map(d => d.features);
  const targets = data.map(d => d.target);
  const featureTensor = tf.tensor2d(featureValues);
  const targetTensor = tf.tensor2d(targets, [targets.length, 1]);
  return { featureTensor, targetTensor };
}

async function trainModel() {
  const { featureTensor, targetTensor } = prepareData(dataset);

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [featureTensor.shape[1]] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError'
  });

  await model.fit(featureTensor, targetTensor, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch:any, logs:any) => {
        console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss}`);
      }
    }
  });

  await model.save('file://artifacts/model');
  console.log('Modelo treinado e salvo com sucesso!');
}

trainModel().catch(err => console.error(err));
