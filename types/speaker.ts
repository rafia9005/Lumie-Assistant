export type Speaker =
  | "amalthea"
  | "andromeda"
  | "apollo"
  | "arcas"
  | "aries"
  | "asteria"
  | "athena"
  | "atlas"
  | "aurora"
  | "callista"
  | "cora"
  | "cordelia"
  | "delia"
  | "draco"
  | "electra"
  | "harmonia"
  | "helena"
  | "hera"
  | "hermes"
  | "hyperion"
  | "iris"
  | "janus"
  | "juno"
  | "jupiter"
  | "luna"
  | "mars"
  | "minerva"
  | "neptune"
  | "odysseus"
  | "ophelia"
  | "orion"
  | "orpheus"
  | "pandora"
  | "phoebe"
  | "pluto"
  | "saturn"
  | "thalia"
  | "theia"
  | "vesta"
  | "zeus";

export type Encoding =
  | "linear16"
  | "flac"
  | "mulaw"
  | "alaw"
  | "mp3"
  | "opus"
  | "aac";

export type Container = "none" | "wav" | "ogg";

export interface AuraInput {
  /**
   * The text content to be converted to speech
   */
  text: string;

  /**
   * Speaker used to produce the audio.
   * @default "luna"
   */
  speaker?: Speaker;

  /**
   * Encoding of the output audio.
   */
  encoding?: Encoding;

  /**
   * Container specifies the file format wrapper for the output audio. 
   * The available options depend on the encoding type.
   */
  container?: Container;

  /**
   * Sample Rate specifies the sample rate for the output audio. 
   * Based on the encoding, different sample rates are supported. 
   * For some encodings, the sample rate is not configurable.
   */
  sample_rate?: number;

  /**
   * The bitrate of the audio in bits per second. 
   * Choose from predefined ranges or specific values based on the encoding type.
   */
  bit_rate?: number;
}