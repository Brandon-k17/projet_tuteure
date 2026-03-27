from rest_framework import viewsets
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('vehicle').all()
    serializer_class = ExpenseSerializer
