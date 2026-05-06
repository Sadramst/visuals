// Mock for powerbi-visuals-api

export default {
  visuals: {
    ISelectionId: class {
      equals(other: unknown): boolean {
        return this === other
      }
    },
  },
}
