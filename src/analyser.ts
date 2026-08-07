/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Analyser class for live audio visualisation.
 */
export class Analyser {
  private analyser: AnalyserNode;
  private bufferLength = 0;
  private dataArray: Uint8Array;

  constructor(node: AudioNode) {
    this.analyser = node.context.createAnalyser();
    this.analyser.fftSize = 64; // Increased from 32 to get more precise bins
    this.analyser.smoothingTimeConstant = 0.92; // Makes it much smoother and less rapid fluctuation
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    node.connect(this.analyser);
  }

  update() {
    this.analyser.getByteFrequencyData(this.dataArray);
  }

  disconnect(node: AudioNode) {
    if (this.analyser) {
      try {
        node.disconnect(this.analyser);
      } catch (e) {}
      try {
        this.analyser.disconnect();
      } catch (e) {}
    }
  }

  get data() {
    return this.dataArray;
  }
}
