/**
 * K-means clustering for semantic code grouping.
 * Groups code chunks by similarity to discover concept areas in the codebase.
 */

/**
 * Represents a discovered concept cluster
 */
export interface ConceptCluster {
  /** Unique cluster identifier (0-indexed) */
  id: number;
  /** Human-readable label derived from representative chunks */
  label: string;
  /** Number of code chunks in this cluster */
  size: number;
  /** Representative chunk IDs for this cluster */
  representativeChunks: string[];
  /** Centroid vector for this cluster */
  centroid: number[];
  /** Keywords extracted from representative chunks */
  keywords: string[];
}

/**
 * Result of clustering operation
 */
export interface ClusteringResult {
  /** Total number of clusters created */
  clusterCount: number;
  /** All discovered concept clusters */
  clusters: ConceptCluster[];
  /** Mapping from chunk ID to cluster ID */
  assignments: Map<string, number>;
}

/**
 * Options for clustering operation
 */
export interface ClusteringOptions {
  /** Target number of clusters (default: auto-determined based on chunk count) */
  numClusters?: number;
  /** Maximum iterations for k-means (default: 100) */
  maxIterations?: number;
  /** Convergence threshold (default: 0.001) */
  convergenceThreshold?: number;
  /** Number of representative chunks to store per cluster (default: 3) */
  numRepresentatives?: number;
}

/**
 * Chunk data needed for clustering
 */
export interface ChunkForClustering {
  id: string;
  content: string;
  filepath: string;
  embedding: number[];
  symbolName?: string;
  symbolType?: string;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate centroid (mean) of a set of vectors
 */
function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot calculate centroid of empty set');
  }

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vec[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}

/**
 * Initialize centroids using k-means++ algorithm for better initial placement
 */
function initializeCentroidsKMeansPP(embeddings: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  const n = embeddings.length;

  // Pick first centroid randomly
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...embeddings[firstIdx]]);

  // Pick remaining centroids with probability proportional to squared distance
  for (let c = 1; c < k; c++) {
    const distances: number[] = [];
    let totalDist = 0;

    for (let i = 0; i < n; i++) {
      // Find minimum distance to existing centroids
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = euclideanDistance(embeddings[i], centroid);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      distances.push(minDist * minDist); // Square the distance
      totalDist += minDist * minDist;
    }

    // Weighted random selection
    let rand = Math.random() * totalDist;
    let selectedIdx = 0;
    for (let i = 0; i < n; i++) {
      rand -= distances[i];
      if (rand <= 0) {
        selectedIdx = i;
        break;
      }
    }

    centroids.push([...embeddings[selectedIdx]]);
  }

  return centroids;
}

/**
 * Perform k-means clustering on embeddings
 */
export function kMeansClustering(
  chunks: ChunkForClustering[],
  options: ClusteringOptions = {}
): ClusteringResult {
  const {
    numClusters = Math.max(3, Math.min(20, Math.ceil(Math.sqrt(chunks.length / 2)))),
    maxIterations = 100,
    convergenceThreshold = 0.001,
    numRepresentatives = 3,
  } = options;

  if (chunks.length === 0) {
    return {
      clusterCount: 0,
      clusters: [],
      assignments: new Map(),
    };
  }

  // Handle edge case where we have fewer chunks than requested clusters
  const k = Math.min(numClusters, chunks.length);

  if (k <= 1) {
    // Single cluster case
    const allEmbeddings = chunks.map((c) => c.embedding);
    const centroid = calculateCentroid(allEmbeddings);
    const assignments = new Map<string, number>();
    for (const chunk of chunks) {
      assignments.set(chunk.id, 0);
    }

    return {
      clusterCount: 1,
      clusters: [
        {
          id: 0,
          label: generateClusterLabel(chunks, chunks.slice(0, numRepresentatives)),
          size: chunks.length,
          representativeChunks: chunks.slice(0, numRepresentatives).map((c) => c.id),
          centroid,
          keywords: extractKeywords(chunks),
        },
      ],
      assignments,
    };
  }

  const embeddings = chunks.map((c) => c.embedding);

  // Initialize centroids using k-means++
  let centroids = initializeCentroidsKMeansPP(embeddings, k);

  // Assignments array: index = chunk index, value = cluster index
  let clusterAssignments = new Array(chunks.length).fill(0);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assignment step: assign each point to nearest centroid
    const newAssignments = new Array(chunks.length).fill(0);
    for (let i = 0; i < chunks.length; i++) {
      let minDist = Infinity;
      let nearestCluster = 0;

      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(embeddings[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          nearestCluster = c;
        }
      }

      newAssignments[i] = nearestCluster;
    }

    // Check for convergence
    let changed = false;
    for (let i = 0; i < chunks.length; i++) {
      if (newAssignments[i] !== clusterAssignments[i]) {
        changed = true;
        break;
      }
    }

    clusterAssignments = newAssignments;

    if (!changed) {
      break;
    }

    // Update step: recalculate centroids
    const newCentroids: number[][] = [];
    let maxShift = 0;

    for (let c = 0; c < k; c++) {
      const clusterVectors: number[][] = [];
      for (let i = 0; i < chunks.length; i++) {
        if (clusterAssignments[i] === c) {
          clusterVectors.push(embeddings[i]);
        }
      }

      if (clusterVectors.length > 0) {
        const newCentroid = calculateCentroid(clusterVectors);
        const shift = euclideanDistance(centroids[c], newCentroid);
        maxShift = Math.max(maxShift, shift);
        newCentroids.push(newCentroid);
      } else {
        // Empty cluster - reinitialize with random point
        const randomIdx = Math.floor(Math.random() * chunks.length);
        newCentroids.push([...embeddings[randomIdx]]);
      }
    }

    centroids = newCentroids;

    // Check for convergence based on centroid shift
    if (maxShift < convergenceThreshold) {
      break;
    }
  }

  // Build cluster results
  const clusterChunks: ChunkForClustering[][] = Array(k)
    .fill(null)
    .map(() => []);

  for (let i = 0; i < chunks.length; i++) {
    clusterChunks[clusterAssignments[i]].push(chunks[i]);
  }

  const assignments = new Map<string, number>();
  for (let i = 0; i < chunks.length; i++) {
    assignments.set(chunks[i].id, clusterAssignments[i]);
  }

  // Create cluster objects with labels and representatives
  const clusters: ConceptCluster[] = [];
  for (let c = 0; c < k; c++) {
    const chunksInCluster = clusterChunks[c];
    if (chunksInCluster.length === 0) continue;

    // Find representative chunks (closest to centroid)
    const sortedByDistance = [...chunksInCluster].sort((a, b) => {
      const distA = euclideanDistance(a.embedding, centroids[c]);
      const distB = euclideanDistance(b.embedding, centroids[c]);
      return distA - distB;
    });

    const representatives = sortedByDistance.slice(0, numRepresentatives);
    const label = generateClusterLabel(chunksInCluster, representatives);
    const keywords = extractKeywords(chunksInCluster);

    clusters.push({
      id: c,
      label,
      size: chunksInCluster.length,
      representativeChunks: representatives.map((r) => r.id),
      centroid: centroids[c],
      keywords,
    });
  }

  // Sort clusters by size (largest first)
  clusters.sort((a, b) => b.size - a.size);

  // Renumber cluster IDs after sorting
  const idMapping = new Map<number, number>();
  clusters.forEach((cluster, newId) => {
    idMapping.set(cluster.id, newId);
    cluster.id = newId;
  });

  // Update assignments with new IDs
  for (const [chunkId, oldClusterId] of assignments) {
    const newClusterId = idMapping.get(oldClusterId);
    if (newClusterId !== undefined) {
      assignments.set(chunkId, newClusterId);
    }
  }

  return {
    clusterCount: clusters.length,
    clusters,
    assignments,
  };
}

/**
 * Generate a human-readable label for a cluster based on its contents
 */
function generateClusterLabel(
  allChunks: ChunkForClustering[],
  representatives: ChunkForClustering[]
): string {
  // Try to derive label from symbol types and file paths
  const symbolTypes = new Map<string, number>();
  const dirPaths = new Map<string, number>();

  for (const chunk of allChunks) {
    if (chunk.symbolType) {
      symbolTypes.set(chunk.symbolType, (symbolTypes.get(chunk.symbolType) || 0) + 1);
    }

    // Extract directory from filepath
    const parts = chunk.filepath.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/');
      dirPaths.set(dir, (dirPaths.get(dir) || 0) + 1);
    }
  }

  // Find dominant symbol type
  let dominantType = '';
  let maxTypeCount = 0;
  for (const [type, count] of symbolTypes) {
    if (count > maxTypeCount) {
      maxTypeCount = count;
      dominantType = type;
    }
  }

  // Find dominant directory
  let dominantDir = '';
  let maxDirCount = 0;
  for (const [dir, count] of dirPaths) {
    if (count > maxDirCount) {
      maxDirCount = count;
      dominantDir = dir;
    }
  }

  // Build label
  const parts: string[] = [];

  if (dominantDir) {
    // Use last directory component
    const dirParts = dominantDir.split('/');
    parts.push(dirParts[dirParts.length - 1]);
  }

  if (dominantType) {
    parts.push(`${dominantType}s`);
  }

  if (parts.length === 0) {
    // Fallback: use keywords from representatives
    const keywords = extractKeywords(representatives);
    if (keywords.length > 0) {
      return keywords.slice(0, 2).join(' & ');
    }
    return 'Code';
  }

  return parts.join(' ');
}

/**
 * Extract keywords from chunk contents for labeling
 */
function extractKeywords(chunks: ChunkForClustering[]): string[] {
  const wordFreq = new Map<string, number>();

  // Common words to exclude
  const stopWords = new Set([
    'function',
    'const',
    'let',
    'var',
    'return',
    'if',
    'else',
    'for',
    'while',
    'import',
    'export',
    'from',
    'class',
    'interface',
    'type',
    'async',
    'await',
    'new',
    'this',
    'true',
    'false',
    'null',
    'undefined',
    'public',
    'private',
    'static',
    'void',
    'string',
    'number',
    'boolean',
    'any',
    'def',
    'self',
    'none',
    'pass',
    'try',
    'except',
    'catch',
    'throw',
    'throws',
    'extends',
    'implements',
    'default',
    'case',
    'break',
    'continue',
  ]);

  for (const chunk of chunks) {
    // Extract identifier-like words
    const words = chunk.content.match(/[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]/g) || [];

    for (const word of words) {
      const lower = word.toLowerCase();
      if (lower.length >= 4 && !stopWords.has(lower)) {
        wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
      }
    }

    // Add symbol name with higher weight
    if (chunk.symbolName) {
      const symbolWords = chunk.symbolName.match(/[A-Z]?[a-z]+/g) || [];
      for (const word of symbolWords) {
        const lower = word.toLowerCase();
        if (lower.length >= 4 && !stopWords.has(lower)) {
          wordFreq.set(lower, (wordFreq.get(lower) || 0) + 3);
        }
      }
    }
  }

  // Sort by frequency and return top keywords
  const sorted = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]);

  return sorted.slice(0, 10).map(([word]) => word);
}

/**
 * Find the cluster ID for a given embedding (nearest centroid)
 */
export function assignToCluster(embedding: number[], clusters: ConceptCluster[]): number {
  let minDist = Infinity;
  let nearestCluster = 0;

  for (const cluster of clusters) {
    const dist = euclideanDistance(embedding, cluster.centroid);
    if (dist < minDist) {
      minDist = dist;
      nearestCluster = cluster.id;
    }
  }

  return nearestCluster;
}

/**
 * Calculate silhouette score for clustering quality assessment
 */
export function calculateSilhouetteScore(
  chunks: ChunkForClustering[],
  assignments: Map<string, number>,
  clusters: ConceptCluster[]
): number {
  if (clusters.length <= 1 || chunks.length <= 1) {
    return 0;
  }

  let totalScore = 0;
  let count = 0;

  for (const chunk of chunks) {
    const clusterId = assignments.get(chunk.id);
    if (clusterId === undefined) continue;

    // Calculate a(i): average distance to other points in same cluster
    let intraClusterDist = 0;
    let intraCount = 0;

    for (const other of chunks) {
      if (other.id === chunk.id) continue;
      if (assignments.get(other.id) === clusterId) {
        intraClusterDist += euclideanDistance(chunk.embedding, other.embedding);
        intraCount++;
      }
    }

    const a = intraCount > 0 ? intraClusterDist / intraCount : 0;

    // Calculate b(i): minimum average distance to points in other clusters
    let minInterClusterDist = Infinity;

    for (const otherCluster of clusters) {
      if (otherCluster.id === clusterId) continue;

      let interDist = 0;
      let interCount = 0;

      for (const other of chunks) {
        if (assignments.get(other.id) === otherCluster.id) {
          interDist += euclideanDistance(chunk.embedding, other.embedding);
          interCount++;
        }
      }

      if (interCount > 0) {
        const avgDist = interDist / interCount;
        if (avgDist < minInterClusterDist) {
          minInterClusterDist = avgDist;
        }
      }
    }

    const b = minInterClusterDist === Infinity ? 0 : minInterClusterDist;

    // Silhouette coefficient for this point
    const maxAB = Math.max(a, b);
    const s = maxAB > 0 ? (b - a) / maxAB : 0;

    totalScore += s;
    count++;
  }

  return count > 0 ? totalScore / count : 0;
}
