import os
import re
from typing import List, Dict, Any

class SafetyDocumentLoader:
    def __init__(self, doc_dir: str = "backend/data/safety_documents"):
        self.doc_dir = doc_dir

    def load_documents(self) -> List[Dict[str, Any]]:
        chunks = []
        if not os.path.exists(self.doc_dir):
            return chunks

        for filename in os.listdir(self.doc_dir):
            if not filename.endswith(".txt"):
                continue

            filepath = os.path.join(self.doc_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            doc_title = title_match.group(1).strip() if title_match else filename.replace("_", " ").replace(".txt", "").title()

            # Split document by numbered sections or headers
            sections = re.split(r"\n(?=[0-9]+\.\s+|[A-Z\s]{4,}:)", content)
            
            for idx, sec in enumerate(sections):
                sec_text = sec.strip()
                if not sec_text:
                    continue
                first_line = sec_text.split("\n")[0].strip("# \t")
                chunks.append({
                    "id": f"{filename}_{idx}",
                    "filename": filename,
                    "doc_title": doc_title,
                    "section_title": first_line if len(first_line) < 80 else f"Section {idx+1}",
                    "text": sec_text,
                    "tokens": self._tokenize(sec_text)
                })

        return chunks

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
        return [w for w in cleaned.split() if len(w) > 2]
