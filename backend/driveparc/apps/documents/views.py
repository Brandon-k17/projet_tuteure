from datetime import date, timedelta
import json, re
import httpx
from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = DocumentSerializer

    def get_queryset(self):
        qs = Document.objects.select_related('vehicle').all()
        vehicle_id = self.request.query_params.get('vehicle')
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return qs

    @action(detail=False, methods=['get'], url_path='expiring')
    def expiring(self, request):
        days = int(request.query_params.get('days', 30))
        today = date.today()
        threshold = today + timedelta(days=days)
        qs = Document.objects.select_related('vehicle').filter(
            expiry_date__isnull=False,
            expiry_date__lte=threshold,
        ).order_by('expiry_date')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


# ── Vue standalone — proxy Anthropic ──────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_document_ai(request):
    """
    POST /api/v1/documents/verify-ai/
    Proxy sécurisé vers Anthropic Vision. La clé API reste côté serveur.
    Body : { image_base64, media_type, expected_type }
    """
    b64   = request.data.get("image_base64")
    mtype = request.data.get("media_type", "image/jpeg")
    dtype = request.data.get("expected_type", "inconnu")

    if not b64:
        return Response({"error": "Pas d'image fournie"}, status=400)

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 300,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": mtype, "data": b64}
                },
                {
                    "type": "text",
                    "text": (
                        "Tu es un expert en vérification de documents administratifs camerounais "
                        "pour la gestion de flotte.\n"
                        "Analyse cette image et réponds en JSON uniquement, sans texte avant ou après :\n"
                        "{\n"
                        '  "is_valid_document": true/false,\n'
                        '  "confidence": 0-100,\n'
                        '  "detected_type": "assurance|carte_grise|visite_technique|vignette|autre|inconnu",\n'
                        '  "matches_expected": true/false,\n'
                        '  "issues": ["liste des problèmes détectés si document suspect"],\n'
                        '  "verdict": "AUTHENTIQUE|SUSPECT|INVALIDE"\n'
                        "}\n"
                        f"Type de document attendu : {dtype}.\n"
                        "Vérifie : présence de tampons officiels, cohérence visuelle, "
                        "qualité d'impression, champs obligatoires présents."
                    )
                }
            ]
        }]
    }

    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=30,
        )
        resp.raise_for_status()
        text  = resp.json()["content"][0]["text"]
        clean = re.sub(r"```json|```", "", text).strip()
        return Response(json.loads(clean))

    except Exception as e:
        return Response({
            "verdict": "SUSPECT",
            "confidence": None,
            "message": f"Vérification indisponible : {str(e)}"
        }, status=200)