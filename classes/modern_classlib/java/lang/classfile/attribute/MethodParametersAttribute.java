package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.DoppioMetadataAttributes;
import java.lang.classfile.MethodElement;
import java.util.Arrays;
import java.util.List;

public interface MethodParametersAttribute extends Attribute<MethodParametersAttribute>, MethodElement {
  List<MethodParameterInfo> parameters();
  static MethodParametersAttribute of(List<MethodParameterInfo> parameters) { return DoppioMetadataAttributes.methodParameters(parameters); }
  static MethodParametersAttribute of(MethodParameterInfo... parameters) { return of(Arrays.asList(parameters)); }
}
