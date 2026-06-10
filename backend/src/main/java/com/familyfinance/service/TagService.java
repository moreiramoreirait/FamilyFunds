package com.familyfinance.service;

import com.familyfinance.entity.*;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TagService {

    private final TagRepository tagRepository;
    private final FamilyGroupService familyGroupService;

    public List<Tag> findAll(UUID groupId, User currentUser) {
        familyGroupService.assertMember(groupId, currentUser.getId());
        return tagRepository.findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(groupId);
    }

    public Tag create(UUID groupId, String name, String color, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        FamilyGroup group = new FamilyGroup();
        group.setId(groupId);

        Tag tag = Tag.builder()
                .familyGroup(group)
                .name(name)
                .color(color)
                .createdBy(currentUser)
                .build();

        return tagRepository.save(tag);
    }

    public Tag update(UUID groupId, UUID tagId, String name, String color, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        Tag tag = tagRepository.findById(tagId)
                .filter(t -> t.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Tag não encontrada"));
        tag.setName(name);
        tag.setColor(color);
        return tagRepository.save(tag);
    }

    public void delete(UUID groupId, UUID tagId, User currentUser) {
        familyGroupService.assertRole(groupId, currentUser.getId(), MemberRole.EDITOR);
        Tag tag = tagRepository.findById(tagId)
                .filter(t -> t.getFamilyGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResourceNotFoundException("Tag não encontrada"));
        tagRepository.delete(tag);
    }
}
