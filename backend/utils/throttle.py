from rest_framework.throttling import SimpleRateThrottle

class BurstRateThrottle(SimpleRateThrottle):
    """10 requests per minute"""
    scope = 'burst'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        email = request.data.get('email', '').lower()
        if email:
            ident = f"{ident}:{email}"
        return self.cache_format % {'scope': self.scope, 'ident': ident}

class SustainedRateThrottle(SimpleRateThrottle):
    """100 requests per hour"""
    scope = 'sustained'
    
    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        email = request.data.get('email', '').lower()
        if email:
            ident = f"{ident}:{email}"
        return self.cache_format % {'scope': self.scope, 'ident': ident}