import * as JVMTypes from '../../includes/JVMTypes';
import * as Doppio from '../doppiojvm';
import JVMThread = Doppio.VM.Threading.JVMThread;
import ReferenceClassData = Doppio.VM.ClassFile.ReferenceClassData;
import IJVMConstructor = Doppio.VM.ClassFile.IJVMConstructor;
import logging = Doppio.Debug.Logging;
import util = Doppio.VM.Util;
import Long = Doppio.VM.Long;

export default function (): any {
  class sun_management_ClassLoadingImpl {
    public static 'setVerboseClass(Z)V'(thread: JVMThread, enabled: number): void {
    }
  }

  class sun_management_MemoryImpl {

    public static 'getMemoryPools0()[Ljava/lang/management/MemoryPoolMXBean;'(thread: JVMThread): JVMTypes.JVMArray<JVMTypes.java_lang_management_MemoryPoolMXBean> {
      // XXX may want to revisit this 'NOP'
      return util.newArrayFromData<JVMTypes.sun_management_MemoryPoolImpl>(thread, thread.getBsCl(), '[Lsun/management/MemoryPoolImpl;', []);
    }

    public static 'getMemoryManagers0()[Ljava/lang/management/MemoryManagerMXBean;'(thread: JVMThread): JVMTypes.JVMArray<JVMTypes.java_lang_management_MemoryManagerMXBean> {
      // XXX may want to revisit this 'NOP'
      return util.newArrayFromData<JVMTypes.sun_management_MemoryManagerImpl>(thread, thread.getBsCl(), '[Lsun/management/MemoryManagerImpl;', []);
    }

    public static 'getMemoryUsage0(Z)Ljava/lang/management/MemoryUsage;'(thread: JVMThread, javaThis: JVMTypes.sun_management_MemoryImpl, arg0: number): void {
      var processMemory = typeof process !== 'undefined' && (<any> process).memoryUsage !== undefined ? (<any> process).memoryUsage() : null,
        heapUsed = processMemory !== null ? Math.max(0, Math.floor(processMemory.heapUsed)) : 0,
        heapCommitted = processMemory !== null ? Math.max(heapUsed, Math.floor(processMemory.heapTotal)) : heapUsed,
        nonHeapUsed = processMemory !== null ? Math.max(0, Math.floor(processMemory.rss - processMemory.heapTotal)) : 0,
        nonHeapCommitted = nonHeapUsed,
        used = arg0 ? heapUsed : nonHeapUsed,
        committed = arg0 ? heapCommitted : nonHeapCommitted;

      thread.import('Ljava/lang/management/MemoryUsage;', (usageCons: IJVMConstructor<JVMTypes.java_lang_management_MemoryUsage>) => {
        var usage = new usageCons(thread);
        usage['java/lang/management/MemoryUsage/init'] = Long.fromNumber(-1);
        usage['java/lang/management/MemoryUsage/used'] = Long.fromNumber(used);
        usage['java/lang/management/MemoryUsage/committed'] = Long.fromNumber(committed);
        usage['java/lang/management/MemoryUsage/max'] = Long.fromNumber(-1);
        thread.asyncReturn(usage);
      });
    }

    public static 'setVerboseGC(Z)V'(thread: JVMThread, javaThis: JVMTypes.sun_management_MemoryImpl, arg0: number): void {
    }

  }

  class sun_management_OperatingSystemImpl {
    public static 'initialize()V'(thread: JVMThread): void {
    }

    public static 'getCommittedVirtualMemorySize()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getTotalSwapSpaceSize()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getFreeSwapSpaceSize()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getProcessCpuTime()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getFreePhysicalMemorySize()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getTotalPhysicalMemorySize()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getOpenFileDescriptorCount()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getMaxFileDescriptorCount()J'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): Long {
      return Long.fromNumber(-1);
    }

    public static 'getSystemCpuLoad()D'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): number {
      return -1;
    }

    public static 'getProcessCpuLoad()D'(thread: JVMThread, javaThis: JVMTypes.java_lang_Object): number {
      return -1;
    }
  }

  class sun_management_VMManagementImpl {

    public static 'getVersion0()Ljava/lang/String;'(thread: JVMThread): JVMTypes.java_lang_String {
      return thread.getJVM().internString("1.2");
    }

    public static 'initOptionalSupportFields()V'(thread: JVMThread): void {
      var vmManagementStatics = <typeof JVMTypes.sun_management_VMManagementImpl> (<ReferenceClassData<JVMTypes.sun_management_VMManagementImpl>> thread.getBsCl().getInitializedClass(thread, 'Lsun/management/VMManagementImpl;')).getConstructor(thread);
      vmManagementStatics['sun/management/VMManagementImpl/compTimeMonitoringSupport'] = 1;
      vmManagementStatics['sun/management/VMManagementImpl/threadContentionMonitoringSupport'] = 0;
      vmManagementStatics['sun/management/VMManagementImpl/currentThreadCpuTimeSupport'] = 1;
      vmManagementStatics['sun/management/VMManagementImpl/otherThreadCpuTimeSupport'] = 1;
      vmManagementStatics['sun/management/VMManagementImpl/threadAllocatedMemorySupport'] = 0;
      vmManagementStatics['sun/management/VMManagementImpl/bootClassPathSupport'] = 0;
      vmManagementStatics['sun/management/VMManagementImpl/objectMonitorUsageSupport'] = 0;
      vmManagementStatics['sun/management/VMManagementImpl/synchronizerUsageSupport'] = 0;
    }

    public static 'isThreadContentionMonitoringEnabled()Z'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): boolean {
      return false;
    }

    public static 'isThreadCpuTimeEnabled()Z'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): boolean {
      return false;
    }

    public static 'isThreadAllocatedMemoryEnabled()Z'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): boolean {
      return false;
    }

    public static 'getTotalClassCount()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      return Long.fromNumber(thread.getBsCl().getLoadedClassNames().length);
    }

    public static 'getUnloadedClassCount()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      return Long.ZERO;
    }

    public static 'getVerboseClass()Z'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): number {
      return 0;
    }

    public static 'getVerboseGC()Z'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): number {
      return 0;
    }

    public static 'getProcessId()I'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): number {
      return 1;
    }

    public static 'getVmArguments0()[Ljava/lang/String;'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): JVMTypes.JVMArray<JVMTypes.java_lang_String> {
      return util.newArrayFromData<JVMTypes.java_lang_String>(thread, thread.getBsCl(), '[Ljava/lang/String;', []);
    }

    public static 'getStartupTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      return Long.fromNumber(thread.getJVM().getStartupTime().getTime());
    }

    public static 'getUptime0()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      return Long.fromNumber(Date.now() - thread.getJVM().getStartupTime().getTime());
    }

    public static 'getAvailableProcessors()I'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): number {
      return 1;
    }

    public static 'getTotalCompileTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      return Long.ZERO;
    }

    public static 'getTotalThreadCount()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      return Long.fromNumber(thread.getThreadPool().getThreads().length);
    }

    public static 'getLiveThreadCount()I'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): number {
      return thread.getThreadPool().getThreads().length;
    }

    public static 'getPeakThreadCount()I'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): number {
      return thread.getThreadPool().getThreads().length;
    }

    public static 'getDaemonThreadCount()I'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): number {
      return thread.getThreadPool().getThreads().filter((thread: JVMThread) => thread.isDaemon()).length;
    }

    public static 'getSafepointCount()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getTotalSafepointTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getSafepointSyncTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getTotalApplicationNonStoppedTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getLoadedClassSize()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getUnloadedClassSize()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getClassLoadingTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getMethodDataSize()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getInitializedClassCount()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getClassInitializationTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

    public static 'getClassVerificationTime()J'(thread: JVMThread, javaThis: JVMTypes.sun_management_VMManagementImpl): Long {
      thread.throwNewException('Ljava/lang/UnsatisfiedLinkError;', 'Native method not implemented.');
      // Satisfy TypeScript return type.
      return null;
    }

  }

  class sun_management_ThreadImpl {
    public static 'setThreadCpuTimeEnabled0(Z)V'(thread: JVMThread, enabled: number): void {
    }

    public static 'getThreadTotalCpuTime0(J)J'(thread: JVMThread, tid: Long): Long {
      return Long.fromNumber(Math.max(0, Date.now() - thread.getJVM().getStartupTime().getTime()) * 1000000);
    }

    public static 'getThreadUserCpuTime0(J)J'(thread: JVMThread, tid: Long): Long {
      return Long.fromNumber(Math.max(0, Date.now() - thread.getJVM().getStartupTime().getTime()) * 1000000);
    }
  }

  return {
    'sun/management/ClassLoadingImpl': sun_management_ClassLoadingImpl,
    'sun/management/MemoryImpl': sun_management_MemoryImpl,
    'sun/management/OperatingSystemImpl': sun_management_OperatingSystemImpl,
    'sun/management/ThreadImpl': sun_management_ThreadImpl,
    'sun/management/VMManagementImpl': sun_management_VMManagementImpl
  };
};
