package com.familyfinance.service;

import com.familyfinance.dto.request.CategoryRequest;
import com.familyfinance.dto.response.CategoryResponse;
import com.familyfinance.dto.response.SubcategoryResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.CategoryRepository;
import com.familyfinance.repository.SubcategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;

    public List<CategoryResponse> getAll(UUID familyGroupId) {
        return categoryRepository.findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(familyGroupId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public CategoryResponse create(UUID familyGroupId, CategoryRequest request, User currentUser) {
        if (categoryRepository.existsByFamilyGroupIdAndNameIgnoreCase(familyGroupId, request.name())) {
            throw new BusinessException("Category with this name already exists");
        }
        FamilyGroup group = new FamilyGroup();
        group.setId(familyGroupId);

        Category category = Category.builder()
                .familyGroup(group)
                .name(request.name())
                .type(request.type())
                .color(request.color())
                .icon(request.icon())
                .isActive(true)
                .isSystem(false)
                .createdBy(currentUser)
                .build();
        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(UUID familyGroupId, UUID categoryId, CategoryRequest request) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        if (!category.getFamilyGroup().getId().equals(familyGroupId)) {
            throw new BusinessException("Category does not belong to this group");
        }
        category.setName(request.name());
        category.setType(request.type());
        category.setColor(request.color());
        category.setIcon(request.icon());
        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(UUID familyGroupId, UUID categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        if (!category.getFamilyGroup().getId().equals(familyGroupId)) {
            throw new BusinessException("Category does not belong to this group");
        }
        if (Boolean.TRUE.equals(category.getIsSystem())) {
            throw new BusinessException("System categories cannot be deleted");
        }
        category.setIsActive(false);
        categoryRepository.save(category);
    }

    @Transactional
    public void createDefaultCategories(FamilyGroup group, User createdBy) {
        record DefaultCat(String name, CategoryType type, String color, String icon, String[] subs) {}

        var defaults = List.of(
                new DefaultCat("Moradia", CategoryType.EXPENSE, "#FF6B6B", "home",
                        new String[]{"Aluguel", "Água", "Energia", "Internet", "Gás", "Condomínio"}),
                new DefaultCat("Alimentação", CategoryType.EXPENSE, "#FFA500", "utensils",
                        new String[]{"Mercado", "Restaurante", "Delivery", "Padaria", "Feira"}),
                new DefaultCat("Transporte", CategoryType.EXPENSE, "#4ECDC4", "car",
                        new String[]{"Combustível", "Uber", "Manutenção", "Estacionamento", "Pedágio"}),
                new DefaultCat("Saúde", CategoryType.EXPENSE, "#45B7D1", "heart",
                        new String[]{"Plano de Saúde", "Farmácia", "Consulta", "Exames"}),
                new DefaultCat("Educação", CategoryType.EXPENSE, "#96CEB4", "book-open",
                        new String[]{"Escola", "Faculdade", "Cursos", "Material"}),
                new DefaultCat("Lazer", CategoryType.EXPENSE, "#FFEAA7", "smile",
                        new String[]{"Cinema", "Viagem", "Streaming", "Jogos", "Esportes"}),
                new DefaultCat("Vestuário", CategoryType.EXPENSE, "#DDA0DD", "shirt",
                        new String[]{"Roupas", "Calçados", "Acessórios"}),
                new DefaultCat("Salário", CategoryType.INCOME, "#00B894", "briefcase",
                        new String[]{"Salário", "Freelance", "Bônus"}),
                new DefaultCat("Investimentos", CategoryType.BOTH, "#6C5CE7", "trending-up",
                        new String[]{"Renda Fixa", "Ações", "Fundos", "Poupança"}),
                new DefaultCat("Outros", CategoryType.BOTH, "#B2BEC3", "more-horizontal",
                        new String[]{"Outros"})
        );

        for (var d : defaults) {
            Category cat = Category.builder()
                    .familyGroup(group)
                    .name(d.name())
                    .type(d.type())
                    .color(d.color())
                    .icon(d.icon())
                    .isActive(true)
                    .isSystem(true)
                    .createdBy(createdBy)
                    .build();
            cat = categoryRepository.save(cat);
            for (String subName : d.subs()) {
                Subcategory sub = Subcategory.builder()
                        .category(cat)
                        .familyGroup(group)
                        .name(subName)
                        .isActive(true)
                        .createdBy(createdBy)
                        .build();
                subcategoryRepository.save(sub);
            }
        }
    }

    public CategoryResponse toResponse(Category c) {
        List<SubcategoryResponse> subs = subcategoryRepository
                .findByCategoryIdAndIsActiveTrueOrderByNameAsc(c.getId())
                .stream()
                .map(s -> new SubcategoryResponse(s.getId(), c.getId(), s.getName(), s.getColor(), s.getIcon(), s.getIsActive()))
                .toList();
        return new CategoryResponse(c.getId(), c.getName(), c.getType(), c.getColor(), c.getIcon(), c.getIsActive(), c.getIsSystem(), subs);
    }
}
