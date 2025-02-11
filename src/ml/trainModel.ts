import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';

// Exemplo: suponha que seu dataset seja um array de objetos com 'features' e 'target'
interface DataPoint {
  features: number[]; // Ex: [price, daysSincePublication, goodStateIndicator]
  target: number;     // Ex: score de qualidade ou probabilidade (entre 0 e 1)
}

// Carregue ou defina seu dataset aqui. Este é um exemplo fictício.
const dataset: DataPoint[] = JSON.parse(fs.readFileSync('artifacts/data/dataset.json', 'utf8'));

// Função para converter os dados em tensores
function prepareData(data: DataPoint[]) {
  const featureValues = data.map(d => d.features);
  const targets = data.map(d => d.target);
  const featureTensor = tf.tensor2d(featureValues);
  const targetTensor = tf.tensor2d(targets, [targets.length, 1]);
  return { featureTensor, targetTensor };
}

async function trainModel() {
  // Extraia os tensores do dataset
  const { featureTensor, targetTensor } = prepareData(dataset);

  // Crie um modelo simples de regressão
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [featureTensor.shape[1]] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError'
  });

  // Treine o modelo
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

  // Salve o modelo (certifique-se de que a pasta "model" exista ou crie-a)
  await model.save('file://artifacts/model');
  console.log('Modelo treinado e salvo com sucesso!');
}

trainModel().catch(err => console.error(err));
