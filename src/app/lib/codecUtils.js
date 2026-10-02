export function applyCodecPreferences(pc, codec) {
  try {
    const caps = RTCRtpSender.getCapabilities?.('audio');
    if (!caps) return;

    const pref = caps.codecs.find(
      (c) => c.mimeType.toLowerCase() === `audio/${codec.toLowerCase()}`,
    );
    if (!pref) return;

    pc
      .getTransceivers()
      .filter((t) => t.sender && t.sender.track?.kind === 'audio')
      .forEach((t) => t.setCodecPreferences([pref]));
  } catch (err) {
    console.error('[codecUtils] applyCodecPreferences error', err);
  }
}
