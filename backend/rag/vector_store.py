import math
import re
from typing import List, Dict, Any, Tuple
from collections import Counter
from backend.rag.document_loader import SafetyDocumentLoader

class SafetyKnowledgeRAG:
    """
    Retrieval-Augmented Generation (RAG) index for laboratory safety documentation.
    Implements TF-IDF / BM25 term weighting and semantic rank scoring.
    """

    def __init__(self, doc_dir: str = "backend/data/safety_documents"):
        self.loader = SafetyDocumentLoader(doc_dir)
        self.chunks: List[Dict[str, Any]] = []
        self.doc_freqs: Counter = Counter()
        self.num_chunks: int = 0
        self.avg_chunk_len: float = 0.0
        self.rebuild_index()

    def rebuild_index(self):
        self.chunks = self.loader.load_documents()
        self.num_chunks = len(self.chunks)
        self.doc_freqs = Counter()

        total_tokens = 0
        for chunk in self.chunks:
            tokens = chunk["tokens"]
            total_tokens += len(tokens)
            unique_tokens = set(tokens)
            for token in unique_tokens:
                self.doc_freqs[token] += 1

        self.avg_chunk_len = (total_tokens / self.num_chunks) if self.num_chunks > 0 else 1.0

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not self.chunks:
            self.rebuild_index()
            if not self.chunks:
                return []

        cleaned_query = re.sub(r"[^a-zA-Z0-9\s]", " ", query.lower())
        query_terms = [t for t in cleaned_query.split() if len(t) > 2]
        if not query_terms:
            return []

        scores: List[Tuple[float, Dict[str, Any]]] = []

        k1 = 1.5
        b = 0.75

        for chunk in self.chunks:
            chunk_tokens = chunk["tokens"]
            chunk_len = len(chunk_tokens)
            term_counts = Counter(chunk_tokens)
            bm25_score = 0.0

            for term in query_terms:
                if term not in term_counts:
                    # Partial match / substring match bonus
                    matches = [tok for tok in chunk_tokens if term in tok or tok in term]
                    if matches:
                        bm25_score += 0.35
                    continue

                tf = term_counts[term]
                df = self.doc_freqs.get(term, 1)
                idf = math.log((self.num_chunks - df + 0.5) / (df + 0.5) + 1.0)
                term_score = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (chunk_len / self.avg_chunk_len))))
                bm25_score += term_score

            # Boost if query words appear in section title or doc title
            for term in query_terms:
                if term in chunk["doc_title"].lower():
                    bm25_score += 1.8
                if term in chunk["section_title"].lower():
                    bm25_score += 2.2

            if bm25_score > 0.1:
                scores.append((bm25_score, chunk))

        scores.sort(key=lambda x: x[0], reverse=True)
        top_results = []
        for score, chunk in scores[:top_k]:
            normalized_score = min(round(score / 10.0, 3), 1.0)
            top_results.append({
                "chunk_id": chunk["id"],
                "filename": chunk["filename"],
                "doc_title": chunk["doc_title"],
                "section": chunk["section_title"],
                "excerpt": chunk["text"][:350] + ("..." if len(chunk["text"]) > 350 else ""),
                "full_text": chunk["text"],
                "relevance_score": normalized_score
            })

        return top_results
