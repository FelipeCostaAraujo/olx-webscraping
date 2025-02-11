declare namespace NodeJS {
    export interface ProcessEnv {
      MONGODB_URI: string;
      PORT: number;
    }
  }