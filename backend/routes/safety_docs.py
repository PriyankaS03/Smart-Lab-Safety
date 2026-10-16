from fastapi import APIRouter
import os
import re
from typing import List, Dict, Any

router = APIRouter(prefix="/api/safety-docs", tags=["Safety Documents"])
DOC_DIR = "backend/data/safety_documents"

@router.get("")
def get_all_documents() -> List[Dict[str, Any]]:
    docs = []
    if not os.path.exists(DOC_DIR):
        return docs

    for filename in sorted(os.listdir(DOC_DIR)):
        if not filename.endswith(".txt"):
            continue
        filepath = os.path.join(DOC_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        doc_id_match = re.search(r"Document ID:\s*([^\n|]+)", content)
        rev_match = re.search(r"Revision:\s*([^\n|]+)", content)
        class_match = re.search(r"Classification:\s*([^\n]+)", content)

        docs.append({
            "filename": filename,
            "title": title_match.group(1).strip() if title_match else filename,
            "document_id": doc_id_match.group(1).strip() if doc_id_match else "SOP-GENERAL",
            "revision": rev_match.group(1).strip() if rev_match else "1.0",
            "classification": class_match.group(1).strip() if class_match else "Standard",
            "content": content
        })

    return docs

@router.get("/{filename}")
def get_single_document(filename: str) -> Dict[str, Any]:
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(DOC_DIR, safe_filename)
    if not os.path.exists(filepath):
        return {"error": "Document not found"}

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    return {
        "filename": safe_filename,
        "content": content
    }
