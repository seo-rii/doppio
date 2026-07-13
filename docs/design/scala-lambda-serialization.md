# Scala Lambda Serialization Design

## Scope

Scala 2.13 emits captured function literals through `invokedynamic`. A
serializable lambda round trip crosses four independently observable layers:

1. `LambdaMetafactory.altMetafactory` creates the serializable function object.
2. `ObjectOutputStream` replaces it with `java.lang.invoke.SerializedLambda`.
3. `SerializedLambda.readResolve()` calls the capturing class's generated
   `$deserializeLambda$` method.
4. Scala's lambda deserializer resolves the implementation method handle and
   restores captured arguments before creating a distinct function object.

This path is kept separate from the broad functional smoke because a failure
can belong to invokedynamic linkage, reflection, method-handle adaptation, or
object-stream replacement rather than ordinary `Function1` invocation.

## Required Behavior

- Doppio-hosted scalac must compile a lambda capturing a primitive `Int`.
- The capturing class must contain `InvokeDynamic`,
  `LambdaMetafactory.altMetafactory`, `$deserializeLambda$`, and
  `SerializedLambda` references.
- The original and restored functions must both preserve the captured offset.
- Deserialization must return a distinct object implementing `Serializable`.
- Host JVM and Doppio output must match exactly.

## Test Shape

`ci/scala_lambda_serialization_smoke.sh` compiles only
`classes/scala_lambda_serialization_smoke`, checks the classfile markers, and
round-trips the generated function through an in-memory object stream. The
expected output is `12:12:15:true:true`.

If the Doppio runtime diverges, reduce the first failing layer before changing
VM semantics. Bootstrap linkage and handle adaptation fixes require a focused
Java `java.lang.invoke` fixture; object replacement fixes require a focused
Java serialization fixture.

## Completion Gates

- Native Scala compile and round trip pass.
- Doppio-hosted Scala compile finishes within the bounded compiler budget.
- The generated classfile markers match the Scala 2.13.18 shape.
- Doppio executes the same round trip and output within the runtime budget.
- The full modern Java fixture suite and workflow coverage checker remain green.

## Verified Result

A 2026-07-13 local run completed the Doppio-hosted Scala 2.13.18 compile in
108 seconds. All classfile markers matched, and both the host JVM and Doppio
printed `12:12:15:true:true`. No VM or class-library change was required for
this focused path.
