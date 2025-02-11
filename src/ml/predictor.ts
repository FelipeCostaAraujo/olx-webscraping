import * as tf from '@tensorflow/tfjs-node';

let model: tf.LayersModel | null = null;

/**
 * Carrega o modelo salvo para realizar previsões.
 * Substitua 'file://model/model.json' pelo caminho correto do seu modelo.
 */
export async function loadModel(): Promise<tf.LayersModel> {
  if (!model) {
    model = await tf.loadLayersModel('file://artifacts/model/model.json');
  }
  return model;
}

/**
 * Faz a previsão de qualidade com base em um array de features.
 * @param features Array de números representando as features do anúncio.
 * @returns Uma previsão numérica (por exemplo, score ou probabilidade).
 */
export async function predictAdQuality(features: number[]): Promise<number> {
  const loadedModel = await loadModel();
  const inputTensor = tf.tensor2d([features], [1, features.length]);
  const predictionTensor = loadedModel.predict(inputTensor) as tf.Tensor;
  const predictionData = await predictionTensor.data();
  return predictionData[0];
}
