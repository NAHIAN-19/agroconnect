from rest_framework import generics, permissions, status
from .serializers import ProfileSetupSerializer
from utils.response import APIResponse


class ProfileSetupView(generics.CreateAPIView):
    serializer_class = ProfileSetupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return APIResponse.success(
            status_code=status.HTTP_201_CREATED,
            message="Profile setup completed successfully."
        )
