package com.worshiproom.post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QotdQuestionRepository extends JpaRepository<QotdQuestion, String> {
    // Inherits existsById(String), findById(String), etc. from JpaRepository.
    // Spec 3.5 uses existsById exclusively. Future Spec 3.9 will extend.
}
