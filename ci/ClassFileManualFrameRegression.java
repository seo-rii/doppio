package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.attribute.StackMapFrameInfo.VerificationTypeInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.SimpleVerificationTypeInfo;
import java.lang.constant.*;
import java.util.*;

/** Native-selected supplied-frame ordering and Object-constructor metadata; never defines classes. */
public class ClassFileManualFrameRegression {
  private static final ClassDesc OBJECT = ConstantDescs.CD_Object;
  private static int passed;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    passed++;
  }
  private static ClassFile context() {
    return ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS, ClassFile.DeadCodeOption.KEEP_DEAD_CODE);
  }
  private static CodeAttribute code(ClassFile context, byte[] bytes) {
    return (CodeAttribute) context.parse(bytes).methods().get(0).code().get();
  }
  private static final class Supplied {
    List<StackMapFrameInfo> caller;
    StackMapTableAttribute attribute;
    StackMapFrameInfo high, low;
  }
  private static void unsortedFrames() {
    ClassFile context = context(); final Supplied supplied = new Supplied();
    byte[] bytes = context.build(ClassDesc.of("C7dUnsortedFramesTarget"), cb -> cb.withMethodBody("run",
        MethodTypeDesc.ofDescriptor("(I)I"), ClassFile.ACC_STATIC, builder -> {
          Label low = builder.newLabel(), high = builder.newLabel();
          builder.iload(0).ifeq(high).labelBinding(low).bipush(7).ireturn().labelBinding(high).iconst_0().ireturn();
          List<VerificationTypeInfo> locals = Collections.<VerificationTypeInfo>singletonList(SimpleVerificationTypeInfo.INTEGER);
          supplied.high = StackMapFrameInfo.of(high, locals, Collections.<VerificationTypeInfo>emptyList());
          supplied.low = StackMapFrameInfo.of(low, locals, Collections.<VerificationTypeInfo>emptyList());
          supplied.caller = new ArrayList<StackMapFrameInfo>(Arrays.asList(supplied.high, supplied.low));
          supplied.attribute = StackMapTableAttribute.of(supplied.caller);
          builder.with(supplied.attribute);
        }));
    CodeAttribute code = code(context, bytes);
    List<StackMapFrameInfo> decoded = code.findAttribute(Attributes.stackMapTable()).get().entries();
    check(decoded.size() == 2 && code.labelToBci(decoded.get(0).target()) == 4 && code.labelToBci(decoded.get(1).target()) == 7 &&
        supplied.caller.get(0) == supplied.high && supplied.caller.get(1) == supplied.low &&
        supplied.attribute.entries().get(0) == supplied.high && supplied.attribute.entries().get(1) == supplied.low &&
        context.verify(bytes).isEmpty(), "Legal unordered supplied frames sort by final BCI without mutating caller or attribute order");
  }
  private static void duplicateFrames() {
    Throwable caught = null;
    try {
      context().build(ClassDesc.of("C7dDuplicateFramesTarget"), cb -> cb.withMethodBody("run",
          MethodTypeDesc.ofDescriptor("(I)V"), ClassFile.ACC_STATIC, builder -> {
            Label target = builder.newLabel(); builder.labelBinding(target).return_();
            StackMapFrameInfo frame = StackMapFrameInfo.of(target,
                Collections.<VerificationTypeInfo>singletonList(SimpleVerificationTypeInfo.INTEGER),
                Collections.<VerificationTypeInfo>emptyList());
            builder.with(StackMapTableAttribute.of(Arrays.asList(frame, frame)));
          }));
    } catch (Throwable failure) { caught = failure; }
    check(caught instanceof IllegalArgumentException, "Duplicate resolved frame BCI is rejected rather than silently collapsed");
  }
  private static void objectConstructorFrame() {
    ClassFile context = context();
    byte[] bytes = context.build(OBJECT, cb -> cb.withMethodBody("<init>", MethodTypeDesc.ofDescriptor("()V"),
        ClassFile.ACC_PUBLIC, builder -> {
          Label target = builder.newLabel(); builder.labelBinding(target).return_();
          builder.with(StackMapTableAttribute.of(Collections.singletonList(StackMapFrameInfo.of(target,
              Collections.<VerificationTypeInfo>singletonList(SimpleVerificationTypeInfo.UNINITIALIZED_THIS),
              Collections.<VerificationTypeInfo>emptyList()))));
        }));
    // This deliberately requests an invalid verification type for Object's
    // already-initialized receiver. Test metadata preservation, never VM definition.
    List<StackMapFrameInfo> frames = code(context, bytes).findAttribute(Attributes.stackMapTable()).get().entries();
    check(frames.size() == 1 && frames.get(0).frameType() == 255 && frames.get(0).locals().size() == 1 &&
        frames.get(0).locals().get(0).tag() == VerificationTypeInfo.ITEM_UNINITIALIZED_THIS,
        "Object constructor compression must preserve supplied UNINITIALIZED_THIS instead of changing it to Object");
  }
  public static void main(String[] args) {
    unsortedFrames(); duplicateFrames(); objectConstructorFrame();
    System.out.println("CLASSFILE_MANUAL_FRAME_REGRESSION_OK|" + passed);
  }
}
