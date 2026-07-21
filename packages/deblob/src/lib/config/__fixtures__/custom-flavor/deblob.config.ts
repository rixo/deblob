export default {
  flavor: {
    classify: (files: readonly string[]) =>
      new Map(
        files.map((file) => [
          file,
          { layer: "model" as const, serviceRoot: null, isPrivate: false },
        ]),
      ),
  },
}
