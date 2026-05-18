export class HarvestNotFoundError extends Error {
  override readonly name = 'HarvestNotFoundError';
  constructor(public readonly harvestId: string) {
    super(`harvest ${harvestId} not found`);
  }
}
