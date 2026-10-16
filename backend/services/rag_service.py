import os
from typing import Dict, Any, List, Optional
from backend.rag.vector_store import SafetyKnowledgeRAG

class SafetyAssistantService:
    def __init__(self, doc_dir: str = "backend/data/safety_documents"):
        self.rag = SafetyKnowledgeRAG(doc_dir)

    def ask(self, question: str) -> Dict[str, Any]:
        results = self.rag.search(question, top_k=3)
        
        q_lower = question.lower()
        emergency_level = "NORMAL"
        if any(w in q_lower for w in ["fire", "explosion", "flame"]):
            emergency_level = "CRITICAL"
        elif any(w in q_lower for w in ["gas leak", "asphyxiation", "toxic gas"]):
            emergency_level = "CRITICAL"
        elif any(w in q_lower for w in ["chemical spill", "acid splash", "poison", "skin contact", "eye splash"]):
            emergency_level = "URGENT"
        elif any(w in q_lower for w in ["ppe", "goggles", "gloves", "lab coat", "mask"]):
            emergency_level = "ADVISORY"

        # Formulate synthesized answers
        if not results:
            return {
                "question": question,
                "answer": "Laboratory Safety Protocol Advisory: For questions regarding laboratory operations, please verify with the Environmental Health and Safety (EHS) officer or refer to the standard operating procedures on Chemical Spills, Fire Response, Gas Leaks, and PPE Requirements.",
                "sources": [],
                "suggested_actions": [
                    "Consult designated Lab Safety Officer",
                    "Verify Safety Data Sheets (SDS) for active reagents",
                    "Check emergency equipment availability"
                ],
                "emergency_level": emergency_level
            }

        primary_doc = results[0]["doc_title"]
        primary_section = results[0]["section"]
        
        # Build answer tailored to standard queries
        answer_text = ""
        actions = []

        if "chemical spill" in q_lower or "spill" in q_lower:
            answer_text = (
                "**Immediate Action Protocol for Chemical Spills:**\n\n"
                "1. **Classify Immediately:** Determine if it is a **Minor Spill** (<500 mL, low toxicity, bench contained) or **Major Spill** (>500 mL, volatile, toxic, or spreading).\n"
                "2. **For Major Spills (SWEEP Protocol):**\n"
                "   - **S**TOP work and shout warnings to all occupants.\n"
                "   - **W**ITHDRAW and close doors to isolate toxic vapor.\n"
                "   - **E**VACUATE the building via emergency stairwells.\n"
                "   - **E**MERGENCY CALL: Pull manual fire alarm and dial 911 / Ext. 5555.\n"
                "   - **P**ROTECT others by posting a sentinel at entry doors to advise arriving HazMat teams.\n"
                "3. **For Minor Spills (C.L.E.A.N. Protocol):** Don heavy nitrile/neoprene gloves and splash goggles. Encircle spill with absorbent neutralizer from perimeter inward. Collect with non-sparking polypropylene tools into hazardous waste bag.\n\n"
                "*(Source: SOP-LAB-CHEM-001)*"
            )
            actions = [
                "Evacuate room immediately if toxic fumes or >500 mL spill",
                "Don heavy gauntlet gloves and splash-proof goggles",
                "Encircle perimeter with neutralizing spill absorbent",
                "Flush exposed skin/eyes for 15 minutes minimum"
            ]

        elif "fire" in q_lower or "flame" in q_lower:
            answer_text = (
                "**Laboratory Fire Response Protocol (R.A.C.E. & P.A.S.S.):**\n\n"
                "1. **R - RESCUE:** Remove anyone in immediate danger without risking self.\n"
                "2. **A - ALARM:** Pull manual fire alarm pull station beside the lab exit. Shout 'FIRE! EVACUATE!'.\n"
                "3. **C - CONFINE:** Close all doors, pull down fume hood sashes, and hit emergency gas shutoff valve.\n"
                "4. **E - EXTINGUISH OR EVACUATE:** Only fight fires if small, trained within 12 months, and clear exit behind you.\n\n"
                "**Extinguisher Operation (P.A.S.S.):**\n"
                "- **P**ull pin breaking seal.\n"
                "- **A**im nozzle low at base of flame.\n"
                "- **S**queeze operating lever steadily.\n"
                "- **S**weep side to side.\n\n"
                "**Note on Solvents (Class B):** NEVER use water on solvent fires (use CO2 or Dry Chemical).\n"
                "**Clothing Fire:** STOP, DROP, and ROLL; wrap in fire blanket."
            )
            actions = [
                "Pull fire alarm pull station immediately",
                "Hit emergency gas shutoff button",
                "Evacuate and close laboratory door",
                "If clothing on fire: STOP, DROP, and ROLL"
            ]

        elif "gas leak" in q_lower or "gas" in q_lower:
            answer_text = (
                "**Compressed Gas & Toxic Gas Leak Response:**\n\n"
                "1. **Cease All Ignition Sources:** Do NOT touch light switches, electrical outlets, or phones in the room (spark danger).\n"
                "2. **Emergency Gas Shutoff:** Press the prominent red EMERGENCY GAS SHUTOFF mushroom button located at lab exits.\n"
                "3. **Evacuate Immediately:** Pull fire alarm pull station outside the lab suite and proceed to external assembly point.\n"
                "4. **Notify Responders:** Advise emergency dispatch of the exact gas identity (e.g., hydrogen, ammonia, liquid nitrogen) and cylinder location.\n"
                "5. **Inert Gas / O2 Depletion:** If liquid nitrogen dewars boil off or oxygen monitor alarms (<19.5% O2), evacuate immediately to prevent rapid asphyxiation."
            )
            actions = [
                "Do NOT operate any electrical switches or phones in room",
                "Hit red Emergency Gas Shutoff button at room exit",
                "Evacuate along upwind direction",
                "Do not re-enter until O2 meter reads 20.9%"
            ]

        elif "ppe" in q_lower or "required" in q_lower or "wear" in q_lower:
            answer_text = (
                "**Mandatory Laboratory PPE Standard (Four Pillars):**\n\n"
                "1. **Lab Coat:** 100% white cotton or flame-resistant Nomex, knee-length, **fully buttoned** at all times.\n"
                "2. **Eye Protection:** ANSI Z87.1 certified chemical splash goggles with indirect baffling. Add polycarbonate face shield for severe splash hazards.\n"
                "3. **Protective Gloves:** Nitrile gloves (min 4-mil) for routine handling. Use Neoprene/Butyl for aggressive polar solvents, Cryogenic for liquid nitrogen, Kevlar for heat.\n"
                "4. **Respiratory Protection:** N95/FFP2 for toxic powders or biological aerosols; organic vapor respirators if handling volatile toxins outside certified fume hoods.\n\n"
                "**Attire Rule:** Long sturdy trousers and fully closed-toe/heel leather shoes are mandatory. No shorts, sandals, or dangling jewelry."
            )
            actions = [
                "Fasten all lab coat buttons from neck to hem",
                "Inspect splash goggles for airtight peripheral seal",
                "Select glove material matching chemical resistance matrix",
                "Ensure hair is tied back and footwear is fully enclosed"
            ]

        elif "improve" in q_lower or "best practice" in q_lower:
            answer_text = (
                "**Core Recommendations to Improve Laboratory Safety:**\n\n"
                "1. **Automated Vision Monitoring:** Keep the Smart Lab Safety AI active during all working shifts to detect missing PPE in real time.\n"
                "2. **Daily Fume Hood Inspection:** Confirm face velocity is between 80–120 FPM and keep sashes pulled down to the arrow mark.\n"
                "3. **Chemical Segregation:** Store acids away from bases, oxidizers away from organics, and flammables in grounded safety cabinets.\n"
                "4. **Uncluttered Egress:** Maintain a 36-inch clearance around all emergency eyewashes, safety showers, and fire pull stations.\n"
                "5. **Regular Drill & PPE Auditing:** Conduct monthly drills for spill containment (C.L.E.A.N.) and PASS fire extinguisher operations."
            )
            actions = [
                "Conduct shift PPE compliance checks",
                "Test eyewash stations weekly for clear water flow",
                "Audit chemical inventory for expired peroxide formers",
                "Verify spill kit neutralizer stocks"
            ]

        else:
            # General answer drawn from RAG chunks
            answer_text = (
                f"**Based on Laboratory Safety Documentation ({primary_doc} - {primary_section}):**\n\n"
                f"{results[0]['full_text'][:500]}...\n\n"
                "Always observe standard biosafety and chemical hygiene operating procedures."
            )
            actions = [
                "Review complete SOP in the Safety Procedures module",
                "Confirm personal protective equipment compliance",
                "Consult the laboratory supervisor for non-standard chemical setups"
            ]

        sources_out = []
        for r in results:
            sources_out.append({
                "document_title": r["doc_title"],
                "filename": r["filename"],
                "section": r["section"],
                "excerpt": r["excerpt"],
                "relevance_score": r["relevance_score"]
            })

        return {
            "question": question,
            "answer": answer_text,
            "sources": sources_out,
            "suggested_actions": actions,
            "emergency_level": emergency_level,
            "sensor_context": None,
        }

    def ask_with_sensor_context(
        self,
        question: str,
        sensor_reading: Optional[Dict[str, Any]] = None,
        fused_risk: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Wrapper that prepends current sensor state to the answer when relevant.
        """
        base = self.ask(question)

        if not sensor_reading:
            return base

        # Build a compact sensor summary
        temp   = sensor_reading.get("temperature", "?");
        hum    = sensor_reading.get("humidity", "?")
        gas    = sensor_reading.get("gas_concentration", "?")
        smoke  = sensor_reading.get("smoke_level", "?")
        aqi    = sensor_reading.get("air_quality", "?")
        vent   = sensor_reading.get("ventilation_status", "?")
        fscore = fused_risk.get("fused_score", "?") if fused_risk else "?"
        flevel = fused_risk.get("risk_level", "?") if fused_risk else "?"

        sensor_block = (
            f"\n\n---\n"
            f"**🌡️ Current Lab Environment (VIRTUAL SENSOR DATA):**  \n"
            f"Temperature: {temp:.1f}°C | Humidity: {hum:.1f}% | "
            f"Gas: {gas:.1f} ppm | Smoke: {smoke:.1f} idx | "
            f"AQI: {aqi:.1f} | Ventilation: {vent}  \n"
            f"**Fused Risk Score:** {fscore}/100 — **{flevel}**  \n"
            f"*(All readings are software-simulated — VIRTUAL_SENSOR source)*"
        )

        base["answer"] = base["answer"] + sensor_block
        base["sensor_context"] = {
            "temperature":       temp,
            "humidity":          hum,
            "gas_concentration": gas,
            "smoke_level":       smoke,
            "air_quality":       aqi,
            "ventilation_status": vent,
            "fused_risk_score":  fscore,
            "risk_level":        flevel,
        }
        return base
