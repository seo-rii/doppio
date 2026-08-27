import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const baseUrl = (process.env.DOPPIO_PAGES_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');
const executablePath = process.env.DOPPIO_CHROMIUM_EXECUTABLE || undefined;
const browser = await chromium.launch({
  executablePath,
  headless: true
});

try {
  const desktop = await browser.newContext({
    viewport: {width: 1440, height: 1000}
  });
  await desktop.addCookies([{
    name: 'dev_bypass_waf',
    value: 'seorii_bypass_token_is_this',
    domain: new URL(baseUrl).hostname,
    path: '/'
  }]);
  const page = await desktop.newPage();
  page.setDefaultTimeout(900_000);
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.stack || error.message));
  page.on('requestfailed', (request) => {
    browserErrors.push(`${request.failure()?.errorText || 'request failed'} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      browserErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${baseUrl}/`, {waitUntil: 'networkidle'});
  assert.equal(await page.locator('h1').textContent(), 'Doppio Modern JVM');
  assert.equal(await page.locator('a[href="./playground/"]').count() > 0, true);

  await page.goto(`${baseUrl}/docs.html?page=compatibility`, {waitUntil: 'networkidle'});
  await page.locator('#document-content h1').waitFor();
  assert.match(await page.locator('#document-content').innerText(), /Modern Java Compatibility/);
  assert.equal(await page.locator('#document-content table').count() > 0, true);

  await page.goto(`${baseUrl}/playground/`, {waitUntil: 'networkidle'});
  await page.locator('#source-editor').fill(`public class Main {
  public static void main(String[] args) {
    System.out.println("Edited Java source persisted");
  }
}
`);
  await page.locator('[data-language="kotlin"]').click();
  await page.locator('#source-editor').fill(`fun main() {
  println("Edited Kotlin source persisted")
}
`);
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await page.locator('[data-language="kotlin"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#source-filename').textContent(), 'Main.kt');
  assert.match(await page.locator('#source-editor').inputValue(), /Edited Kotlin source persisted/);
  await page.locator('[data-language="java"]').click();
  assert.match(await page.locator('#source-editor').inputValue(), /Edited Java source persisted/);
  await page.locator('#reset-button').click();
  await page.locator('[data-language="kotlin"]').click();
  await page.locator('#reset-button').click();
  assert.doesNotMatch(await page.locator('#source-editor').inputValue(), /Edited Kotlin source persisted/);
  assert.equal(await page.locator('#playground-state').getAttribute('data-state'), 'ready');
  await page.locator('[data-language="scala"]').click();
  await page.locator('#reset-button').click();

  const languageRuns = [
    ['java', 'Doppio says: Java + Kotlin + Scala'],
    ['kotlin', 'Kotlin@2011 -> Doppio@2014'],
    ['scala', 'Scala on Doppio: 6, 12, 24']
  ];
  for (const [language, expectedOutput] of languageRuns) {
    await page.locator(`[data-language="${language}"]`).click();
    await page.locator('#run-button').click();
    await page.waitForFunction(() => {
      const state = document.querySelector('#playground-state');
      const runButton = document.querySelector('#run-button');
      return state &&
        (state.dataset.state === 'ready' || state.dataset.state === 'error') &&
        !runButton.disabled;
    });
    const state = await page.locator('#playground-state').getAttribute('data-state');
    const consoleOutput = await page.locator('#console-output').innerText();
    assert.equal(state, 'ready', `${language} failed:\n${consoleOutput}`);
    assert.match(consoleOutput, new RegExp(expectedOutput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  await page.locator('[data-language="java"]').click();
  await page.locator('#source-editor').fill(`import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.EnumSet;
import java.util.Set;

public class Main {
  public static void main(String[] args) throws Exception {
    Path root = Files.createTempDirectory("doppio-browser-flags");

    FileAttribute<Set<PosixFilePermission>> readOnly =
        PosixFilePermissions.asFileAttribute(
            EnumSet.of(PosixFilePermission.OWNER_READ));
    FileAttribute<Set<PosixFilePermission>> writeOnly =
        PosixFilePermissions.asFileAttribute(
            EnumSet.of(PosixFilePermission.OWNER_WRITE));
    FileAttribute<Set<PosixFilePermission>> executeOnly =
        PosixFilePermissions.asFileAttribute(
            EnumSet.of(PosixFilePermission.OWNER_EXECUTE));
    FileAttribute<Set<PosixFilePermission>> noAccess =
        PosixFilePermissions.asFileAttribute(
            EnumSet.noneOf(PosixFilePermission.class));
    printAccess("read", Files.createFile(root.resolve("read-only.txt"), readOnly));
    printAccess("write", Files.createFile(root.resolve("write-only.txt"), writeOnly));
    printAccess("execute", Files.createFile(root.resolve("execute-only.txt"), executeOnly));
    printAccess("none", Files.createFile(root.resolve("no-access.txt"), noAccess));

    Path write = Files.write(
        root.resolve("write.txt"), "ABC".getBytes(StandardCharsets.UTF_8));
    try (SeekableByteChannel channel = Files.newByteChannel(
        write, EnumSet.of(StandardOpenOption.WRITE))) {
      channel.write(ByteBuffer.wrap(new byte[] { 'Z' }));
    }
    System.out.println("browser-write:"
        + new String(Files.readAllBytes(write), StandardCharsets.UTF_8));

    Path missing = root.resolve("missing.txt");
    try (SeekableByteChannel ignored = Files.newByteChannel(
        missing, EnumSet.of(StandardOpenOption.WRITE))) {
      System.out.println("browser-missing:opened");
    } catch (NoSuchFileException expected) {
      System.out.println("browser-missing:false:" + Files.exists(missing));
    }

    Path truncate = Files.write(
        root.resolve("truncate.txt"), "ABC".getBytes(StandardCharsets.UTF_8));
    try (SeekableByteChannel channel = Files.newByteChannel(
        truncate,
        EnumSet.of(StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING))) {
      channel.write(ByteBuffer.wrap(new byte[] { 'T' }));
    }
    System.out.println("browser-truncate:"
        + new String(Files.readAllBytes(truncate), StandardCharsets.UTF_8));

    Path append = Files.write(
        root.resolve("append.txt"), "ABC".getBytes(StandardCharsets.UTF_8));
    try (SeekableByteChannel channel = Files.newByteChannel(
        append, EnumSet.of(StandardOpenOption.APPEND))) {
      channel.position(0L);
      channel.write(ByteBuffer.wrap(new byte[] { 'D' }));
    }
    System.out.println("browser-append:"
        + new String(Files.readAllBytes(append), StandardCharsets.UTF_8));

    Path scatter = Files.write(
        root.resolve("scatter.txt"), "ABC".getBytes(StandardCharsets.UTF_8));
    long scatterCount;
    long scatterPosition;
    int scatterFirstPosition;
    int scatterSecondPosition;
    String scatterBytes;
    long scatterEof;
    long scatterEmpty;
    try (FileChannel channel = (FileChannel) Files.newByteChannel(
        scatter, EnumSet.of(StandardOpenOption.READ))) {
      ByteBuffer first = ByteBuffer.allocate(1);
      ByteBuffer second = ByteBuffer.allocateDirect(4);
      scatterCount = channel.read(new ByteBuffer[] { first, second });
      scatterPosition = channel.position();
      scatterFirstPosition = first.position();
      scatterSecondPosition = second.position();
      scatterBytes = new String(new byte[] {
          first.get(0), second.get(0), second.get(1)
      }, StandardCharsets.UTF_8);
      scatterEof = channel.read(new ByteBuffer[] {
          ByteBuffer.allocate(1), ByteBuffer.allocateDirect(1)
      });
      scatterEmpty = channel.read(new ByteBuffer[] {
          ByteBuffer.allocate(0), ByteBuffer.allocateDirect(0)
      });
    }
    System.out.println("browser-scatter:" + scatterCount + ":" + scatterPosition
        + ":" + scatterFirstPosition + ":" + scatterSecondPosition + ":"
        + scatterBytes + ":" + scatterEof + ":" + scatterEmpty);

    Path gather = root.resolve("gather.txt");
    long gatherCount;
    long gatherPosition;
    try (FileChannel channel = (FileChannel) Files.newByteChannel(
        gather,
        EnumSet.of(
            StandardOpenOption.CREATE,
            StandardOpenOption.WRITE,
            StandardOpenOption.TRUNCATE_EXISTING))) {
      gatherCount = channel.write(new ByteBuffer[] {
          ByteBuffer.wrap(new byte[] { 'A' }),
          ByteBuffer.wrap(new byte[] { 'B' })
      });
      gatherPosition = channel.position();
    }
    System.out.println("browser-gather:" + gatherCount + ":" + gatherPosition + ":"
        + new String(Files.readAllBytes(gather), StandardCharsets.UTF_8));

    Path create = Files.write(
        root.resolve("create.txt"), "ABC".getBytes(StandardCharsets.UTF_8));
    try (SeekableByteChannel channel = Files.newByteChannel(
        create,
        EnumSet.of(StandardOpenOption.READ, StandardOpenOption.WRITE,
            StandardOpenOption.CREATE, StandardOpenOption.DSYNC))) {
      channel.write(ByteBuffer.wrap(new byte[] { 'C' }));
    }
    System.out.println("browser-create-dsync:"
        + new String(Files.readAllBytes(create), StandardCharsets.UTF_8));

    Path deleteOnClose = Files.write(
        root.resolve("delete-on-close.txt"), "ABC".getBytes(StandardCharsets.UTF_8));
    boolean deleteDuring;
    try (SeekableByteChannel channel = Files.newByteChannel(
        deleteOnClose,
        EnumSet.of(StandardOpenOption.WRITE, StandardOpenOption.DELETE_ON_CLOSE))) {
      deleteDuring = Files.exists(deleteOnClose);
      channel.write(ByteBuffer.wrap(new byte[] { 'D' }));
    }
    System.out.println("browser-delete-on-close:"
        + deleteDuring + ":" + Files.exists(deleteOnClose));

    Path output = Files.write(
        root.resolve("output.txt"), "ABC".getBytes(StandardCharsets.UTF_8));
    try (OutputStream stream = Files.newOutputStream(output, StandardOpenOption.WRITE)) {
      stream.write('O');
    }
    System.out.println("browser-output:"
        + new String(Files.readAllBytes(output), StandardCharsets.UTF_8));

    Path legacyUnlinkedOutput = Files.write(
        root.resolve("legacy-unlinked-output.txt"), new byte[] { 'A' });
    FileOutputStream legacyOutput = new FileOutputStream(
        legacyUnlinkedOutput.toFile(), true);
    legacyOutput.write('B');
    boolean legacyOutputDeleted = legacyUnlinkedOutput.toFile().delete();
    legacyOutput.close();
    System.out.println("browser-legacy-unlinked-output:"
        + legacyOutputDeleted + ":" + Files.exists(legacyUnlinkedOutput));

    Path legacyUnlinkedRandom = Files.write(
        root.resolve("legacy-unlinked-random.txt"), new byte[] { 'A' });
    RandomAccessFile legacyRandom = new RandomAccessFile(
        legacyUnlinkedRandom.toFile(), "rw");
    legacyRandom.write('R');
    Files.delete(legacyUnlinkedRandom);
    legacyRandom.close();
    System.out.println("browser-legacy-unlinked-random:"
        + Files.exists(legacyUnlinkedRandom));

    Path streamChannelAppend = Files.write(
        root.resolve("stream-channel-append.txt"),
        new byte[] { 'A' });
    long streamChannelGatherCount;
    long streamChannelOpenPosition;
    long streamChannelResetPosition;
    long streamChannelPosition;
    int streamChannelFirstPosition;
    int streamChannelSecondPosition;
    try (FileOutputStream stream = new FileOutputStream(
        streamChannelAppend.toFile(), true)) {
      FileChannel channel = stream.getChannel();
      streamChannelOpenPosition = channel.position();
      channel.position(0L);
      streamChannelResetPosition = channel.position();
      stream.write('B');
      channel.position(0L);
      ByteBuffer first = ByteBuffer.wrap(new byte[] { 'C' });
      ByteBuffer second = ByteBuffer.wrap(new byte[] { 'D' });
      streamChannelGatherCount = channel.write(new ByteBuffer[] { first, second });
      streamChannelFirstPosition = first.position();
      streamChannelSecondPosition = second.position();
      streamChannelPosition = channel.position();
    }
    System.out.println("browser-stream-channel-append:"
        + streamChannelOpenPosition + ":" + streamChannelResetPosition + ":"
        + streamChannelGatherCount + ":" + streamChannelFirstPosition + ":"
        + streamChannelSecondPosition + ":" + streamChannelPosition + ":"
        + new String(Files.readAllBytes(streamChannelAppend), StandardCharsets.UTF_8));

    Path nested = Files.createDirectories(root.resolve("mutations").resolve("nested"));
    Path created = Files.createFile(nested.resolve("created.txt"));
    System.out.println("browser-create-file:" + Files.isRegularFile(created));

    Path copySource = Files.write(
        root.resolve("copy-source.txt"), "payload".getBytes(StandardCharsets.UTF_8));
    Path copyTarget = root.resolve("copy-target.txt");
    Files.copy(copySource, copyTarget);
    System.out.println("browser-copy:"
        + new String(Files.readAllBytes(copyTarget), StandardCharsets.UTF_8));

    Path copyExisting = Files.write(
        root.resolve("copy-existing.txt"), "old".getBytes(StandardCharsets.UTF_8));
    boolean copyExistingRejected = false;
    try {
      Files.copy(copySource, copyExisting);
    } catch (FileAlreadyExistsException expected) {
      copyExistingRejected = true;
    }
    System.out.println("browser-copy-existing:" + copyExistingRejected
        + ":" + new String(Files.readAllBytes(copyExisting), StandardCharsets.UTF_8));
    Files.copy(copySource, copyExisting, StandardCopyOption.REPLACE_EXISTING);
    System.out.println("browser-copy-replace:"
        + new String(Files.readAllBytes(copyExisting), StandardCharsets.UTF_8));

    Path copyAttributes = root.resolve("copy-attributes.txt");
    Files.copy(copySource, copyAttributes, StandardCopyOption.COPY_ATTRIBUTES);
    System.out.println("browser-copy-attributes:"
        + new String(Files.readAllBytes(copyAttributes), StandardCharsets.UTF_8));

    Path copyAttributesDirectory = Files.createDirectory(root.resolve("copy-attributes-dir"));
    Path copiedAttributesDirectory = root.resolve("copied-attributes-dir");
    Files.copy(
        copyAttributesDirectory,
        copiedAttributesDirectory,
        StandardCopyOption.COPY_ATTRIBUTES);
    System.out.println("browser-copy-directory-attributes:"
        + Files.isDirectory(copiedAttributesDirectory));

    Path moveSource = Files.write(
        root.resolve("move-source.txt"), "move".getBytes(StandardCharsets.UTF_8));
    Path moveTarget = root.resolve("move-target.txt");
    Files.move(moveSource, moveTarget);
    System.out.println("browser-move:"
        + new String(Files.readAllBytes(moveTarget), StandardCharsets.UTF_8)
        + ":" + Files.exists(moveSource));

    Path moveExistingSource = Files.write(
        root.resolve("move-existing-source.txt"), "replace".getBytes(StandardCharsets.UTF_8));
    Path moveExistingTarget = Files.write(
        root.resolve("move-existing-target.txt"), "old".getBytes(StandardCharsets.UTF_8));
    boolean moveExistingRejected = false;
    try {
      Files.move(moveExistingSource, moveExistingTarget);
    } catch (FileAlreadyExistsException expected) {
      moveExistingRejected = true;
    }
    System.out.println("browser-move-existing:" + moveExistingRejected
        + ":" + new String(Files.readAllBytes(moveExistingTarget), StandardCharsets.UTF_8));
    Files.move(moveExistingSource, moveExistingTarget, StandardCopyOption.REPLACE_EXISTING);
    System.out.println("browser-move-replace:"
        + new String(Files.readAllBytes(moveExistingTarget), StandardCharsets.UTF_8)
        + ":" + Files.exists(moveExistingSource));

    Path crossMountSource = Files.write(
        root.resolve("atomic-source.txt"), "atomic".getBytes(StandardCharsets.UTF_8));
    Path crossMountTarget = Paths.get("/work/atomic-target.txt");
    Files.deleteIfExists(crossMountTarget);
    boolean atomicRejected = false;
    try {
      Files.move(crossMountSource, crossMountTarget, StandardCopyOption.ATOMIC_MOVE);
    } catch (AtomicMoveNotSupportedException expected) {
      atomicRejected = true;
    }
    System.out.println("browser-atomic-cross-mount:" + atomicRejected
        + ":" + Files.exists(crossMountSource) + ":" + Files.exists(crossMountTarget));
    Files.move(crossMountSource, crossMountTarget);
    System.out.println("browser-move-cross-mount:"
        + new String(Files.readAllBytes(crossMountTarget), StandardCharsets.UTF_8)
        + ":" + Files.exists(crossMountSource));
    Files.delete(crossMountTarget);

    Path crossMountDirectory = Files.createDirectory(root.resolve("move-directory"));
    Path crossMountDirectoryTarget = Paths.get("/work/move-directory-target");
    Files.deleteIfExists(crossMountDirectoryTarget);
    Files.move(crossMountDirectory, crossMountDirectoryTarget);
    System.out.println("browser-move-directory-cross-mount:"
        + Files.isDirectory(crossMountDirectoryTarget)
        + ":" + Files.exists(crossMountDirectory));
    Files.delete(crossMountDirectoryTarget);

    System.out.println("browser-delete-if-exists:"
        + Files.deleteIfExists(created) + ":" + Files.deleteIfExists(created));
  }

  private static void printAccess(String label, Path path) {
    System.out.println("browser-access-" + label + ":"
        + Files.isReadable(path) + ":"
        + Files.isWritable(path) + ":"
        + Files.isExecutable(path));
  }
}
`);
  await page.locator('#run-button').click();
  await page.waitForFunction(() => {
    const state = document.querySelector('#playground-state');
    const runButton = document.querySelector('#run-button');
    return state &&
      (state.dataset.state === 'ready' || state.dataset.state === 'error') &&
      !runButton.disabled;
  });
  const browserFlagsState = await page.locator('#playground-state').getAttribute('data-state');
  const browserFlagsOutput = await page.locator('#console-output').innerText();
  assert.equal(browserFlagsState, 'ready', `browser provider flags failed:\n${browserFlagsOutput}`);
  for (const expectedOutput of [
    'browser-access-read:true:false:false',
    'browser-access-write:false:true:false',
    'browser-access-execute:false:false:true',
    'browser-access-none:false:false:false',
    'browser-write:ZBC',
    'browser-missing:false:false',
    'browser-truncate:T',
    'browser-append:ABCD',
    'browser-scatter:3:3:1:2:ABC:-1:0',
    'browser-gather:2:2:AB',
    'browser-create-dsync:CBC',
    'browser-delete-on-close:false:false',
    'browser-output:OBC',
    'browser-legacy-unlinked-output:true:false',
    'browser-legacy-unlinked-random:false',
    'browser-create-file:true',
    'browser-copy:payload',
    'browser-copy-existing:true:old',
    'browser-copy-replace:payload',
    'browser-copy-attributes:payload',
    'browser-copy-directory-attributes:true',
    'browser-move:move:false',
    'browser-move-existing:true:old',
    'browser-move-replace:replace:false',
    'browser-atomic-cross-mount:true:true:false',
    'browser-move-cross-mount:atomic:false',
    'browser-move-directory-cross-mount:true:false',
    'browser-delete-if-exists:true:false'
  ]) {
    assert.match(browserFlagsOutput, new RegExp(expectedOutput));
  }
  assert.equal(
    browserFlagsOutput.split(/\r?\n/).includes(
      'browser-stream-channel-append:1:1:2:1:1:4:ABCD'
    ),
    true
  );

  const browserLeaseEvents = await page.evaluate(async () => {
    const browserFs = window.BrowserFS;
    const doppio = window.Doppio;
    if (!browserFs || !doppio?.VM?.FDState) {
      throw new Error('Browser runtime did not expose BrowserFS and FDState.');
    }

    const fs = browserFs.BFSRequire('fs');
    const BufferCtor = browserFs.BFSRequire('buffer').Buffer;
    const FDState = doppio.VM.FDState;
    const path = `/work/browser-fd-lease-${Date.now()}.txt`;
    const events = [];
    fs.writeFileSync(path, 'lease', 'utf8');
    const fd = fs.openSync(path, 'r');
    const originalRead = fs.read;
    FDState.open(fd, 0, false, 0, path);
    const lease = FDState.acquireOperation(fd);
    if (!lease) {
      throw new Error('Could not acquire the browser descriptor lease.');
    }

    try {
      return await new Promise((resolve, reject) => {
        let dispatchReturned = false;
        let settled = false;
        let hostReadCallbackCount = 0;
        let timeout;
        const finish = (error) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeout);
          if (error) {
            reject(error);
          } else {
            resolve(events);
          }
        };
        timeout = setTimeout(() => {
          finish(new Error(`Browser descriptor lease timed out: ${events.join(',')}`));
        }, 5_000);
        // The pinned InMemory backend invokes read callbacks synchronously.
        // Keep its real result, but defer delivery by one event-loop task to
        // fault-inject the close/reuse window an asynchronous backend creates.
        fs.read = function(...args) {
          const callback = args.pop();
          return originalRead.call(fs, ...args, (...callbackArgs) => {
            hostReadCallbackCount += 1;
            if (hostReadCallbackCount !== 1) {
              const duplicateError =
                new Error('BrowserFS invoked the deferred read callback more than once.');
              if (settled) {
                throw duplicateError;
              }
              finish(duplicateError);
              return;
            }
            setTimeout(() => callback(...callbackArgs), 0);
          });
        };
        const target = BufferCtor.alloc(5);

        fs.read(fd, target, 0, target.length, 0, (readError, bytesRead) => {
          events.push('read-completed');
          if (!dispatchReturned) {
            finish(new Error('Deferred BrowserFS read callback ran before dispatch returned.'));
            return;
          }
          if (readError || bytesRead !== 5 || target.toString('utf8') !== 'lease') {
            finish(readError || new Error(`Unexpected browser read result: ${bytesRead}`));
            return;
          }
          if (FDState.isCurrent(fd, lease.generation)) {
            finish(new Error('Logically closed browser descriptor remained current.'));
            return;
          }
          events.push('release-operation');
          FDState.releaseOperation(lease);
        });
        events.push('read-dispatched');

        const closeAccepted = FDState.requestClose(fd, (closeInfo) => {
          events.push('lease-drained');
          fs.close(closeInfo.fd, (closeError) => {
            events.push('host-closed');
            try {
              fs.unlinkSync(path);
            } catch (unlinkError) {
              finish(unlinkError);
              return;
            }
            finish(closeError);
          });
        });
        events.push('logical-close');
        if (!closeAccepted) {
          finish(new Error('Browser descriptor close request was rejected.'));
          return;
        }
        try {
          FDState.open(fd, 0, false, 0, path);
          finish(new Error('Closing browser descriptor allowed early number reuse.'));
          return;
        } catch (_expected) {
          events.push('reuse-blocked');
        }
        dispatchReturned = true;
      });
    } finally {
      fs.read = originalRead;
    }
  });
  assert.deepEqual(browserLeaseEvents, [
    'read-dispatched',
    'logical-close',
    'reuse-blocked',
    'read-completed',
    'release-operation',
    'lease-drained',
    'host-closed'
  ]);
  assert.deepEqual(browserErrors, []);
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: {width: 390, height: 844}
  });
  await mobile.addCookies([{
    name: 'dev_bypass_waf',
    value: 'seorii_bypass_token_is_this',
    domain: new URL(baseUrl).hostname,
    path: '/'
  }]);
  const mobilePage = await mobile.newPage();
  for (const path of ['/', '/docs.html?page=kotlin', '/playground/']) {
    await mobilePage.goto(`${baseUrl}${path}`, {waitUntil: 'networkidle'});
    if (path.includes('docs.html')) {
      await mobilePage.locator('#document-content h1').waitFor();
    }
    const widths = await mobilePage.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    assert.equal(widths.scroll, widths.client, `${path} overflows horizontally on mobile`);
  }
  await mobile.close();

  console.log('Pages Chromium smoke passed for docs, mobile layout, Java, Kotlin, Scala, provider file mutations, owner-mode access checks, and the event-loop-deferred BrowserFS descriptor lease canary.');
} finally {
  await browser.close();
}
