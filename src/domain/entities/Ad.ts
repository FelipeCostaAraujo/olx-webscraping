export class Ad {
    constructor(
      public id: string,
      public title: string,
      public price: number,
      public url: string,
      public imageUrl: string,
      public searchQuery: string,
      public superPrice: boolean,
      public location: string,
      public publishedAt: string,
      public createdAt: Date,
      public blacklisted: boolean
    ) {}
  }
  