from datetime import date


def date_range_filter(queryset, field: str, start: date = None, end: date = None):
    if start:
        queryset = queryset.filter(**{f"{field}__gte": start})
    if end:
        queryset = queryset.filter(**{f"{field}__lte": end})
    return queryset
