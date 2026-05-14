"""
apps/fuel/serializers.py
"""
from rest_framework import serializers
from django.utils import timezone
from .models import FuelCard, FuelTransaction, MonthlyFuelAllocation


class FuelCardSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    current_balance = serializers.SerializerMethodField()
    monthly_quota   = serializers.IntegerField(read_only=True)
    usage_pct       = serializers.SerializerMethodField()
    card_number_masked = serializers.SerializerMethodField()

    class Meta:
        model  = FuelCard
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_vehicle_info(self, obj):
        v = obj.vehicle
        return {
            'id':                  v.id,
            'registration_number': v.registration_number,
            'make':                v.make,
            'model':               v.model,
            'vehicle_type':        v.vehicle_type,
            'assigned_driver':     v.bus_driver.get_full_name() if v.bus_driver else None,
        }

    def get_current_balance(self, obj):
        return float(obj.current_balance())

    def get_usage_pct(self, obj):
        now = timezone.now()
        alloc = obj.allocations.filter(year=now.year, month=now.month).first()
        budget = float(alloc.allocated_amount) if alloc else obj.monthly_quota
        balance = float(obj.current_balance())
        used = budget - balance
        return round((used / budget) * 100, 1) if budget else 0

    def get_card_number_masked(self, obj):
        """Affiche ex : 5288 **** **** 1234"""
        n = obj.card_number.replace(' ', '')
        if len(n) >= 16:
            return f"{n[:4]} **** **** {n[-4:]}"
        return obj.card_number


class FuelTransactionSerializer(serializers.ModelSerializer):
    driver_name       = serializers.CharField(source='driver.get_full_name', read_only=True)
    vehicle_name      = serializers.SerializerMethodField()
    card_number       = serializers.SerializerMethodField()
    mission_info      = serializers.SerializerMethodField()
    receipt_photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = FuelTransaction
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'total_amount',
            'validated_by', 'status', 'driver',
            'card',   # ← card devient read_only, assigné dans perform_create
        ]

    def get_vehicle_name(self, obj):
        v = obj.card.vehicle
        return f"{v.make} {v.model} — {v.registration_number}"

    def get_mission_info(self, obj):
        if obj.reservation:
            r = obj.reservation
            return {
                'id':          r.id,
                'destination': r.destination,
                'requester':   r.requester.get_full_name() if r.requester else None,
            }
        return None

    def get_receipt_photo_url(self, obj):
        if obj.receipt_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_photo.url)
        return None

    def validate(self, data):
        if data.get('transaction_type') == 'MISSION' and not data.get('reservation'):
            raise serializers.ValidationError(
                {'reservation': 'La réservation est obligatoire pour une mission.'}
            )
        # ← supprime tout le bloc de vérification de carte/chauffeur
        # cette logique va dans perform_create côté view
        return data
    def get_card_number(self, obj):
        if obj.card:
            n = obj.card.card_number.replace(' ', '')
            if len(n) >= 16:
                return f"{n[:4]} **** **** {n[-4:]}"
        return None

    def validate(self, data):
        if data.get('transaction_type') == 'MISSION' and not data.get('reservation'):
            raise serializers.ValidationError(
                {'reservation': 'La réservation est obligatoire pour une mission.'}
            )
        return data


class MonthlyFuelAllocationSerializer(serializers.ModelSerializer):
    card_info    = FuelCardSerializer(source='card', read_only=True)
    used_amount  = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    usage_pct    = serializers.FloatField(read_only=True)

    class Meta:
        model  = MonthlyFuelAllocation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class FuelDashboardSerializer(serializers.Serializer):
    """Résumé mensuel pour le gestionnaire."""
    budget_total   = serializers.DecimalField(max_digits=14, decimal_places=2)
    consumed_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance_total  = serializers.DecimalField(max_digits=14, decimal_places=2)
    usage_pct      = serializers.FloatField()
    active_cards   = serializers.IntegerField()
    total_cards    = serializers.IntegerField()
    pending_transactions = serializers.IntegerField()
    top_consumers  = serializers.ListField()