package java.lang.invoke;

final class DoppioVarHandle extends VarHandle {
  DoppioVarHandle(Class<?> type, Class<?>[] coordinates, boolean readOnly, boolean exactBehavior) {
    super(type, coordinates, readOnly, exactBehavior);
  }

  private VarHandle view(boolean exact) {
    if (exactBehavior == exact) return this;
    DoppioVarHandle copy = new DoppioVarHandle(valueType,
        coordinates.toArray(new Class<?>[coordinates.size()]), readOnly, exact);
    DoppioVarHandles.copyStorage(this, copy);
    return copy;
  }

  public VarHandle withInvokeExactBehavior() { return view(true); }
  public VarHandle withInvokeBehavior() { return view(false); }
}
